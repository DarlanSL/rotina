-- CreateEnum
CREATE TYPE "BillKind" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "ProjectGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BillKind" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "amountCents" INTEGER,
    "repeatKind" "RepeatKind",
    "intervalDays" INTEGER NOT NULL DEFAULT 30,
    "monthDay" INTEGER,
    "weekOrdinal" INTEGER,
    "weekday" INTEGER,
    "repeatTimes" INTEGER,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "nextDueAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" DATE NOT NULL,
    "amountCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGroup_userId_name_key" ON "ProjectGroup"("userId", "name");

-- CreateIndex
CREATE INDEX "Bill_userId_active_nextDueAt_idx" ON "Bill"("userId", "active", "nextDueAt");

-- CreateIndex
CREATE INDEX "BillPayment_billId_paidAt_idx" ON "BillPayment"("billId", "paidAt");

-- CreateIndex
CREATE INDEX "Project_groupId_idx" ON "Project"("groupId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroup" ADD CONSTRAINT "ProjectGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

