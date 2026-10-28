-- Login por usuário e senha: remove as tabelas do Auth.js (OAuth/sessões em banco)

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "image",
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- Contas existentes: usuário = parte do e-mail antes do @ (sufixo do id se repetir).
-- Ficam sem senha até alguém defini-la (seed ou admin).
UPDATE "User" SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]', '', 'g'));
UPDATE "User" u SET "username" = u."username" || '-' || right(u."id", 6)
WHERE u."username" = '' OR EXISTS (SELECT 1 FROM "User" o WHERE o."username" = u."username" AND o."id" < u."id");
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "VerificationToken";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
