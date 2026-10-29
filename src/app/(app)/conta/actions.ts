"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema, firstError, profileSchema } from "@/lib/validations";
import { z } from "zod";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return success("Dados atualizados");
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  const { passwordHash } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.current, passwordHash))) return failure("Senha atual incorreta");

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return success("Senha alterada");
}

const weatherCitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/** Cidade padrão da previsão do tempo (null remove). */
export async function setWeatherCity(city: { name: string; lat: number; lon: number } | null): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = city ? weatherCitySchema.safeParse(city) : null;
  if (parsed && !parsed.success) return failure("Cidade inválida");

  await db.user.update({
    where: { id: user.id },
    data: parsed
      ? { weatherCity: parsed.data.name, weatherLat: parsed.data.lat, weatherLon: parsed.data.lon }
      : { weatherCity: null, weatherLat: null, weatherLon: null },
  });
  revalidatePath("/", "layout");
  return success(parsed ? `Previsão para ${parsed.data.name}` : "Cidade removida");
}

export async function setShowWeather(show: boolean): Promise<ActionResult> {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { showWeather: show } });
  revalidatePath("/", "layout");
  return success(show ? "Previsão do tempo visível" : "Previsão do tempo escondida");
}
