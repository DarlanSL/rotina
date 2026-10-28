import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations usam a conexão direta (no Neon, a URL sem "-pooler"); o app usa DATABASE_URL
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
