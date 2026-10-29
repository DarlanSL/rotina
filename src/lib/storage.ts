import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { del, get, head, issueSignedToken, presignUrl } from "@vercel/blob";

/**
 * Armazenamento dos anexos.
 * - "blob": Vercel Blob privado. Na Vercel, conectar o store cria BLOB_STORE_ID e a autenticação é
 *   automática (OIDC); fora dela, use BLOB_READ_WRITE_TOKEN.
 * - "local": pasta .uploads/ do projeto, só para desenvolvimento.
 * - "off": na Vercel sem store — anexos desativados com aviso, em vez de falhar no disco somente-leitura.
 */
export type StorageMode = "blob" | "local" | "off";

export function storageMode(): StorageMode {
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.VERCEL ? "off" : "local";
}

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

function localPath(pathname: string) {
  const full = path.resolve(LOCAL_ROOT, pathname);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Caminho inválido");
  return full;
}

/** Grava o corpo da requisição em .uploads/, parando se passar do limite. */
export async function writeLocalFile(pathname: string, body: ReadableStream<Uint8Array>, limit: number) {
  const file = localPath(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  let written = 0;
  const source = Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    written += chunk.length;
    if (written > limit) source.destroy(new Error("Arquivo grande demais"));
  });
  try {
    await pipeline(source, createWriteStream(file));
  } catch (error) {
    await rm(file, { force: true });
    throw error;
  }
  return written;
}

/** Tamanho real do arquivo guardado (ou null se não existe) — não confiamos no que o navegador diz. */
export async function storedSize(pathname: string): Promise<number | null> {
  try {
    if (storageMode() === "blob") return (await head(pathname)).size;
    return (await stat(localPath(pathname))).size;
  } catch {
    return null;
  }
}

export async function deleteStoredFiles(pathnames: string[]) {
  if (pathnames.length === 0) return;
  try {
    if (storageMode() === "blob") await del(pathnames);
    else await Promise.all(pathnames.map((p) => rm(localPath(p), { force: true })));
  } catch (error) {
    // o registro já saiu do banco; um arquivo órfão não deve quebrar a exclusão
    console.error("Falha ao apagar anexos", error);
  }
}

const SIGNED_URL_MS = 60 * 60 * 1000;

/**
 * Entrega o arquivo para quem já foi autorizado.
 * No Blob, redireciona para um link assinado de 1h (o vídeo vem direto do CDN, com avanço/retrocesso);
 * se a assinatura falhar, repassa o conteúdo pelo servidor.
 */
export async function serveStoredFile(pathname: string, contentType: string, request: Request): Promise<Response> {
  const range = request.headers.get("range");

  if (storageMode() === "blob") {
    try {
      const validUntil = Date.now() + SIGNED_URL_MS;
      const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
      const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private", validUntil });
      return new Response(null, {
        status: 302,
        headers: { Location: presignedUrl, "Cache-Control": "private, max-age=3000" },
      });
    } catch (error) {
      console.error("Falha ao assinar link do anexo; repassando pelo servidor", error);
    }
    const result = await get(pathname, { access: "private", headers: range ? { range } : undefined });
    if (!result || result.statusCode !== 200) return new Response("Não encontrado", { status: 404 });
    const headers = new Headers({ "Content-Type": contentType, "Cache-Control": "private, max-age=3600", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" });
    for (const h of ["content-length", "content-range", "etag"]) {
      const v = result.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(result.stream, { status: result.headers.get("content-range") ? 206 : 200, headers });
  }

  const file = localPath(pathname);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  const headers = new Headers({ "Content-Type": contentType, "Cache-Control": "private, max-age=3600", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" });
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match && (match[1] || match[2])) {
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
}
