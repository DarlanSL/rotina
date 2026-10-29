import { uploadPresigned } from "@vercel/blob/client";
import { attachmentPrefix, mediaKind, safeFileName } from "@/lib/attachments";

/** Código do navegador: prepara e envia fotos/vídeos. Quem registra no banco é a action attachMedia. */

const MAX_IMAGE_SIDE = 2048;
const SKIP_RESIZE_BELOW = 1.5 * 1024 * 1024;

/** Reduz fotos grandes (celular tira 4–8 MB) para JPEG de até 2048px. Se não der, envia a original. */
export async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < SKIP_RESIZE_BELOW) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function randomSuffix() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
}

let modePromise: Promise<string> | null = null;
function storageMode() {
  modePromise ??= fetch("/api/anexos/upload")
    .then((r) => r.json())
    .then((d: { mode: string }) => d.mode)
    .catch((error) => {
      modePromise = null;
      throw error;
    });
  return modePromise;
}

export type UploadedFile = { pathname: string; name: string; contentType: string };

export async function uploadMedia(itemId: string, file: File, onProgress: (percent: number) => void): Promise<UploadedFile> {
  const kind = mediaKind(file.type);
  if (!kind) throw new Error("Só fotos e vídeos");
  const mode = await storageMode();
  if (mode === "off") throw new Error("Anexos ainda não configurados no servidor");

  if (mode === "blob") {
    // nome aleatório no caminho: o link assinado vale só para ele e nunca sobrescreve outro arquivo
    const pathname = `${attachmentPrefix(itemId)}${randomSuffix()}-${safeFileName(file.name)}`;
    const blob = await uploadPresigned(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/anexos/upload",
      clientPayload: JSON.stringify({ itemId, kind }),
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    return { pathname: blob.pathname, name: file.name, contentType: file.type };
  }

  // Desenvolvimento: envia para o próprio servidor (XHR para ter progresso)
  const params = new URLSearchParams({ itemId, name: file.name });
  const result = await new Promise<{ pathname?: string; error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/anexos/upload?${params}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("Falha no envio"));
      }
    };
    xhr.onerror = () => reject(new Error("Falha no envio"));
    xhr.send(file);
  });
  if (!result.pathname) throw new Error(result.error ?? "Falha no envio");
  return { pathname: result.pathname, name: file.name, contentType: file.type };
}
