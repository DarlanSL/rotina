import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signupEnabled } from "@/lib/auth";
import { SignupForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  if (!signupEnabled) redirect("/login");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Cada conta tem seus próprios registros, rotinas e documentos.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
