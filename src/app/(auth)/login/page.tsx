import type { Metadata } from "next";
import Link from "next/link";
import { signupEnabled } from "@/lib/auth";
import { LoginForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Diário de atividades, rotinas, documentos e ideias em um só lugar.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <LoginForm />
        {signupEnabled && (
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
