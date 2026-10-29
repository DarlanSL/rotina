import { randomBytes } from "node:crypto";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { storageMode, writeLocalFile } from "@/lib/storage";
import { checkItemAcceptsAttachment } from "@/lib/queries/attachments";
import { attachmentPrefix, isAttachmentPathFor, maxBytes, mediaKind, safeFileName, type MediaKind } from "@/lib/attachments";

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const UPLOAD_LINK_MS = 15 * 60 * 1000;

/** O navegador pergunta antes de enviar: direto ao Vercel Blob ou para este servidor (dev). */
export async function GET() {
  return Response.json({ mode: storageMode() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return fail("Não autenticado", 401);

  const mode = storageMode();
  if (mode === "off") return fail("Armazenamento de anexos não configurado", 503);
  if (mode === "local") return uploadLocal(request, userId);

  // Vercel Blob: só assinamos um link de envio para aquele caminho; o arquivo vai do navegador direto ao Blob
  try {
    const body = (await request.json()) as HandleUploadPresignedBody;
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
        const { itemId, kind } = JSON.parse(clientPayload ?? "{}") as { itemId?: string; kind?: MediaKind };
        if (!itemId || (kind !== "image" && kind !== "video")) throw new Error("Envio inválido");
        if (!isAttachmentPathFor(itemId, pathname)) throw new Error("Caminho inválido");
        const problem = await checkItemAcceptsAttachment(userId, itemId);
        if (problem) throw new Error(problem);

        const limits = {
          allowedContentTypes: [kind === "image" ? "image/*" : "video/*"],
          maximumSizeInBytes: maxBytes(kind),
          validUntil: Date.now() + UPLOAD_LINK_MS,
        };
        const token = await issueSignedToken({ pathname, operations: ["put"], ...limits });
        return { token, urlOptions: { ...limits, allowOverwrite: false } };
      },
    });
    return Response.json(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha no envio");
  }
}

async function uploadLocal(request: Request, userId: string) {
  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const kind = mediaKind(contentType);
  if (!kind || !request.body) return fail("Só fotos e vídeos");
  const problem = await checkItemAcceptsAttachment(userId, itemId);
  if (problem) return fail(problem);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes(kind)) return fail("Arquivo grande demais", 413);

  const pathname = `${attachmentPrefix(itemId)}${randomBytes(6).toString("hex")}-${safeFileName(url.searchParams.get("name") ?? "")}`;
  try {
    await writeLocalFile(pathname, request.body, maxBytes(kind));
  } catch {
    return fail("Arquivo grande demais", 413);
  }
  return Response.json({ pathname });
}
