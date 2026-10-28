import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm, ProfileForm } from "@/components/auth/account-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Minha conta" description={`Você entra como @${user.username}.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
            <CardDescription>Como você aparece no menu e na tela inicial.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name ?? ""} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
            <CardDescription>Use uma senha que você não usa em outros sites.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
