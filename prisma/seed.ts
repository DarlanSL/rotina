import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, startOfDayInTz, toDbDate, todayISO } from "../src/lib/dates";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Conta de demonstração — troque a senha (ou não rode o seed) em produção
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo1234";
const tz = "America/Sao_Paulo";
const today = todayISO(tz);
const d = (offset: number) => toDbDate(addDays(today, offset));
/** Instante às `hour`h do dia (today + offset) no fuso do usuário. */
const at = (offset: number, hour: number) =>
  new Date(startOfDayInTz(addDays(today, offset), tz).getTime() + hour * 3_600_000);

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await db.user.upsert({
    where: { username: DEMO_USERNAME },
    update: { passwordHash },
    create: { username: DEMO_USERNAME, passwordHash, name: "Usuário Demo", timezone: tz },
  });

  // Limpa os dados do demo para o seed ser repetível
  await db.$transaction([
    db.activity.deleteMany({ where: { userId: user.id } }),
    db.tag.deleteMany({ where: { userId: user.id } }),
    db.routine.deleteMany({ where: { userId: user.id } }),
    db.document.deleteMany({ where: { userId: user.id } }),
    db.item.deleteMany({ where: { userId: user.id } }),
    db.project.deleteMany({ where: { userId: user.id } }),
  ]);

  const tag = (name: string) => ({
    where: { userId_name: { userId: user.id, name } },
    create: { userId: user.id, name },
  });

  const activities = [
    {
      date: d(0),
      startTime: "09:00",
      endTime: "10:30",
      title: "Reunião de planejamento semanal",
      notes: "Prioridades: fechar orçamento e revisar contratos.",
      tags: ["trabalho"],
    },
    { date: d(0), startTime: "07:00", endTime: "07:40", title: "Caminhada 40 min", tags: ["saúde"] },
    {
      date: d(-1),
      startTime: "14:00",
      endTime: "15:15",
      title: "Enviei proposta para cliente X",
      notes: "Aguardando retorno até sexta.",
      tags: ["trabalho", "vendas"],
    },
    { date: d(-1), title: "Organizei documentos do carro", tags: ["pessoal"] },
    { date: d(-3), title: "Revisão do código do app Rotina", tags: ["projetos"] },
  ];
  for (const a of activities) {
    await db.activity.create({
      data: {
        userId: user.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        title: a.title,
        notes: a.notes,
        tags: { connectOrCreate: a.tags.map(tag) },
      },
    });
  }

  // Rotinas em cada status: vencida, vence hoje, próxima, em dia
  const routines = [
    { title: "Revisar extintores", intervalDays: 180, alertDaysBefore: 15, last: -185 },
    { title: "Backup do computador", intervalDays: 7, alertDaysBefore: 2, last: -7 },
    { title: "Trocar filtro de água", intervalDays: 90, alertDaysBefore: 7, last: -85 },
    { title: "Conferir extrato bancário", intervalDays: 30, alertDaysBefore: 3, last: -2 },
    { title: "Regar as plantas", intervalDays: 3, alertDaysBefore: 1, last: 0 },
  ];
  for (const r of routines) {
    const routine = await db.routine.create({
      data: {
        userId: user.id,
        title: r.title,
        intervalDays: r.intervalDays,
        alertDaysBefore: r.alertDaysBefore,
        lastCompletedAt: d(r.last),
        nextDueAt: d(r.last + r.intervalDays),
      },
    });
    await db.routineCompletion.create({
      data: { routineId: routine.id, completedAt: d(r.last), createdAt: at(r.last, 10) },
    });
  }

  // Revisão que foi prorrogada (vence hoje após o adiamento), com histórico
  const vistoria = await db.routine.create({
    data: {
      userId: user.id,
      title: "Vistoria do ar-condicionado",
      intervalDays: 60,
      alertDaysBefore: 5,
      lastCompletedAt: d(-65),
      nextDueAt: d(0),
    },
  });
  await db.routineCompletion.create({
    data: { routineId: vistoria.id, completedAt: d(-65), createdAt: at(-65, 10) },
  });
  await db.routinePostponement.create({
    data: {
      routineId: vistoria.id,
      fromDate: d(-5),
      toDate: d(0),
      reason: "Técnico remarcou a visita por falta de peça.",
      createdAt: at(-5, 11),
    },
  });

  await db.document.createMany({
    data: [
      { userId: user.id, name: "CNH", type: "CNH", issuer: "DETRAN-SP", expiresAt: d(-10), warnDays: 30 },
      {
        userId: user.id,
        name: "Seguro do carro",
        type: "Seguro",
        issuer: "Seguradora",
        expiresAt: d(20),
        warnDays: 30,
      },
      {
        userId: user.id,
        name: "Alvará de funcionamento",
        type: "Alvará",
        issuer: "Prefeitura",
        expiresAt: d(45),
        warnDays: 60,
      },
      {
        userId: user.id,
        name: "Passaporte",
        type: "Passaporte",
        issuer: "Polícia Federal",
        expiresAt: d(900),
        warnDays: 180,
      },
    ],
  });

  const app = await db.project.create({
    data: { userId: user.id, name: "App Rotina", description: "Melhorias e ideias para o próprio app.", color: "blue" },
  });
  const casa = await db.project.create({
    data: { userId: user.id, name: "Reforma da casa", color: "amber" },
  });

  await db.item.createMany({
    data: [
      {
        userId: user.id,
        projectId: app.id,
        type: "IMPROVEMENT",
        title: "Notificações push de vencimento",
        priority: "HIGH",
      },
      {
        userId: user.id,
        projectId: app.id,
        type: "IMPROVEMENT",
        title: "Exportar diário em PDF",
        status: "IN_PROGRESS",
      },
      {
        userId: user.id,
        projectId: app.id,
        type: "IMPROVEMENT",
        title: "Modo escuro",
        status: "DONE",
        completedAt: at(-2, 15),
      },
      {
        userId: user.id,
        projectId: app.id,
        type: "IMPROVEMENT",
        title: "Login com Google",
        status: "DONE",
        completedAt: at(-5, 10),
      },
      {
        userId: user.id,
        projectId: app.id,
        type: "NOTE",
        title: "Stack",
        content: "Next.js + Prisma + Postgres (Neon) + Auth.js",
      },
      { userId: user.id, projectId: casa.id, type: "IMPROVEMENT", title: "Pintar a varanda", priority: "LOW" },
      { userId: user.id, projectId: casa.id, type: "IDEA", title: "Horta vertical na lavanderia" },
      {
        userId: user.id,
        type: "IDEA",
        title: "Curso de inglês online",
        content: "Pesquisar opções com aula de conversação.",
      },
      { userId: user.id, type: "NOTE", title: "Senha do Wi-Fi da casa da praia fica no envelope azul" },
      { userId: user.id, type: "REMINDER", title: "Ligar para o contador", remindAt: at(0, 14), priority: "HIGH" },
      {
        userId: user.id,
        type: "REMINDER",
        title: "Buscar exame no laboratório",
        remindAt: at(0, 8),
        status: "DONE",
        completedAt: at(0, 9),
      },
      { userId: user.id, projectId: casa.id, type: "IMPROVEMENT", title: "Orçamento do pintor", remindAt: at(0, 18) },
      { userId: user.id, type: "REMINDER", title: "Pagar IPVA", remindAt: at(-1, 9) },
      { userId: user.id, type: "REMINDER", title: "Aniversário da Ana", remindAt: at(5, 8) },
    ],
  });

  console.log(`Seed concluído — entre com usuário "${DEMO_USERNAME}" e senha "${DEMO_PASSWORD}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
