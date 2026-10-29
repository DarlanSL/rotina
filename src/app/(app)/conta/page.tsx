import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm, ProfileForm } from "@/components/auth/account-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherSettings } from "@/components/weather/weather-settings";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const user = await requireUser();
  const prefs = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { weatherCity: true, showWeather: true },
  });

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
        <Card id="previsao" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Previsão do tempo</CardTitle>
            <CardDescription>A bolinha no canto da tela mostra o tempo de hoje e dos próximos dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeatherSettings city={prefs.weatherCity} show={prefs.showWeather} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
