import { z } from "zod";
import { isTimeBefore } from "@/lib/dates";

// Campos de formulário vazios chegam como "" — tratamos como ausentes
const optionalText = (max = 5000) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const optionalIsoDate = z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional());
const intField = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const optionalTime = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido")
    .optional(),
);

export const activitySchema = z
  .object({
    date: isoDate,
    title: z.string().trim().min(1, "Informe um título").max(200),
    notes: optionalText(),
    startTime: optionalTime,
    endTime: optionalTime,
    // "trabalho, saúde" → ["trabalho", "saúde"]
    tags: z.preprocess(
      (v) =>
        typeof v === "string"
          ? [
              ...new Set(
                v
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              ),
            ]
          : [],
      z.array(z.string().max(40)).max(10),
    ),
  })
  .refine((a) => !a.endTime || a.startTime, { message: "Informe o horário de início", path: ["startTime"] })
  .refine((a) => !a.startTime || !a.endTime || isTimeBefore(a.startTime, a.endTime), {
    message: "O horário de término deve ser depois do início",
    path: ["endTime"],
  });

export const routineSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  description: optionalText(),
  intervalDays: intField(1, 3650),
  alertDaysBefore: intField(0, 365),
  lastCompletedAt: optionalIsoDate,
});

export const postponeSchema = z.object({
  newDate: isoDate,
  reason: z.string().trim().min(5, "Explique o motivo do adiamento (mín. 5 caracteres)").max(500),
});

export const documentSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(200),
  type: z.string().trim().min(1, "Informe o tipo").max(80),
  issuer: optionalText(120),
  expiresAt: isoDate,
  warnDays: intField(0, 365),
  notes: optionalText(),
});

export const ITEM_TYPES = ["IDEA", "NOTE", "REMINDER", "IMPROVEMENT"] as const;
export const ITEM_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "DISCARDED"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export const itemSchema = z.object({
  type: z.enum(ITEM_TYPES),
  title: z.string().trim().min(1, "Informe um título").max(300),
  content: optionalText(20_000),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  projectId: optionalText(40),
  // o cliente envia ISO completo (já convertido do fuso do navegador)
  remindAt: z.preprocess((v) => (v === "" ? undefined : v), z.iso.datetime({ offset: true }).optional()),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  description: optionalText(),
  color: optionalText(20),
});

// ---------- Contas ----------

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O usuário precisa ter pelo menos 3 caracteres")
  .max(30, "O usuário pode ter no máximo 30 caracteres")
  .regex(/^[a-z0-9._-]+$/, "Use só letras sem acento, números, ponto, hífen ou sublinhado");

const newPassword = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres");

// No login não validamos o formato: qualquer erro vira "usuário ou senha inválidos"
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha").max(128),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome").max(120),
    username: usernameField,
    password: newPassword,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] });

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(120),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual"),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] })
  .refine((d) => d.password !== d.current, { message: "A nova senha deve ser diferente da atual", path: ["password"] });

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

// ---------- Listas ----------
export const listNameSchema = z.string().trim().min(1, "Dê um nome à lista").max(60, "Nome muito longo");

const LIST_ENTRY_MAX = 200;
const LIST_ENTRIES_PER_ADD = 100;

/** "arroz, feijão; café" ou várias linhas → um item por parte (sem vazios e sem repetir). */
export function splitListEntries(text: string): string[] {
  const parts = text
    .split(/[\n,;]+/)
    .map((p) => p.trim().replace(/\s+/g, " ").slice(0, LIST_ENTRY_MAX))
    .filter(Boolean);
  return [...new Set(parts)].slice(0, LIST_ENTRIES_PER_ADD);
}
