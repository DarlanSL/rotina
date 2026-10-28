"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { signIn, signupEnabled } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { clearFailures, lockedMinutes, registerFailure } from "@/lib/login-throttle";
import { firstError, signupSchema } from "@/lib/validations";

export type AuthFormState = { error: string } | null;

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Informe usuário e senha" };

  const minutes = lockedMinutes(username);
  if (minutes) return { error: `Muitas tentativas erradas. Tente de novo em ${minutes} min.` };

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      registerFailure(username);
      return { error: "Usuário ou senha inválidos" };
    }
    // sucesso: signIn lança o redirect para "/"
    clearFailures(username);
    throw error;
  }
  return null;
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!signupEnabled) return { error: "Cadastro desativado. Peça uma conta ao administrador." };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, username, password } = parsed.data;

  try {
    await db.user.create({ data: { name, username, passwordHash: await hashPassword(password) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Este usuário já existe. Escolha outro." };
    }
    throw error;
  }
  await signIn("credentials", { username, password, redirectTo: "/" });
  return null;
}
