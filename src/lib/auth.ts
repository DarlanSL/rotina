import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations";

/** Cadastro aberto na tela de login (defina AUTH_SIGNUP="false" para só o admin criar contas). */
export const signupEnabled = process.env.AUTH_SIGNUP !== "false";

// Hash descartável: usuário inexistente custa o mesmo tempo que senha errada,
// então o tempo de resposta não revela quais usuários existem.
let dummyHash: Promise<string> | undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT é obrigatório com provider Credentials e evita consulta ao banco a cada request
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { username },
          select: { id: true, name: true, passwordHash: true },
        });
        const ok = await verifyPassword(password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("x"))));
        if (!user?.passwordHash || !ok) return null;
        return { id: user.id, name: user.name };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
