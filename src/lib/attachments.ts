/** Regras de anexos (fotos e vídeos) compartilhadas entre navegador e servidor. */

export type MediaKind = "image" | "video";

export const MAX_ATTACHMENTS_PER_ITEM = 10;
/** Fotos são reduzidas no navegador antes de enviar; o limite vale para o arquivo final. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const ACCEPT_MEDIA = "image/*,video/*";

export function mediaKind(contentType: string): MediaKind | null {
  // SVG pode conter script; fica de fora
  if (contentType.startsWith("image/") && !contentType.startsWith("image/svg")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return null;
}

export function maxBytes(kind: MediaKind) {
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Nome seguro para o caminho do arquivo: sem acentos, espaços ou barras. */
export function safeFileName(fullName: string) {
  const name = fullName.split(/[/\\]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${base || "arquivo"}${ext ? `.${ext}` : ""}`;
}

/** Todo anexo de um item mora em anexos/<itemId>/… — o servidor confere isso e o dono do item. */
export function attachmentPrefix(itemId: string) {
  return `anexos/${itemId}/`;
}

export function isAttachmentPathFor(itemId: string, pathname: string) {
  const prefix = attachmentPrefix(itemId);
  const rest = pathname.slice(prefix.length);
  return pathname.startsWith(prefix) && rest.length > 0 && !rest.includes("/") && !rest.includes("..");
}
