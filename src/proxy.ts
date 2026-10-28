import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Checagem otimista: sem cookie de sessão, manda direto para /login antes de renderizar.
 * A validação real (assinatura do JWT + dono dos dados) continua em requireUser().
 */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tudo exceto login, cadastro, rotas de API (fazem a própria checagem), assets e arquivos do PWA
  matcher: ["/((?!login|cadastro|api|_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest).*)"],
};
