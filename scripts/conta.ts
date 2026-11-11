/**
 * Recuperar acesso (não há "esqueci a senha" por e-mail no app).
 *
 *   Listar usuários:      npx tsx scripts/conta.ts listar
 *   Definir nova senha:   npx tsx scripts/conta.ts senha <usuario> <nova-senha>
 *
 * Usa o DATABASE_URL do ambiente. Para produção, rode com o endereço do Neon:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/conta.ts listar
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const [cmd, username, password] = process.argv.slice(2);
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`Banco: ${host}`);

  if (cmd === "listar") {
    const users = await db.user.findMany({ select: { username: true, name: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    for (const u of users) console.log(`@${u.username}${u.name ? ` (${u.name})` : ""} — criado em ${u.createdAt.toLocaleDateString("pt-BR")}`);
    return;
  }

  if (cmd === "senha" && username && password) {
    if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres");
    const user = await db.user.update({
      where: { username: username.replace(/^@/, "").toLowerCase() },
      data: { passwordHash: await hashPassword(password) },
      select: { username: true },
    });
    console.log(`Senha de @${user.username} alterada.`);
    return;
  }

  console.log("Uso: listar | senha <usuario> <nova-senha>");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
