import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serveStoredFile } from "@/lib/storage";

/** Abre um anexo — só para o dono. Os arquivos são privados no armazenamento. */
export async function GET(request: Request, ctx: RouteContext<"/api/anexos/[id]">) {
  const userId = (await auth())?.user?.id;
  if (!userId) return new Response("Não autenticado", { status: 401 });

  const { id } = await ctx.params;
  const attachment = await db.attachment.findFirst({
    where: { id, userId },
    select: { pathname: true, contentType: true },
  });
  if (!attachment) return new Response("Não encontrado", { status: 404 });

  return serveStoredFile(attachment.pathname, attachment.contentType, request);
}
