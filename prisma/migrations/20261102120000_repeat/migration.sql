-- CreateEnum
CREATE TYPE "RepeatKind" AS ENUM ('INTERVAL', 'MONTHLY_DAY', 'MONTHLY_WEEKDAY');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "seriesId" TEXT;

-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "monthDay" INTEGER,
ADD COLUMN     "repeatKind" "RepeatKind" NOT NULL DEFAULT 'INTERVAL',
ADD COLUMN     "repeatTimes" INTEGER,
ADD COLUMN     "weekOrdinal" INTEGER,
ADD COLUMN     "weekday" INTEGER;

-- CreateTable
CREATE TABLE "ActivitySeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repeatKind" "RepeatKind" NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "monthDay" INTEGER,
    "weekOrdinal" INTEGER,
    "weekday" INTEGER,
    "startDate" DATE NOT NULL,
    "repeatTimes" INTEGER,
    "generatedUntil" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivitySeries_userId_active_idx" ON "ActivitySeries"("userId", "active");

-- CreateIndex
CREATE INDEX "Activity_seriesId_date_idx" ON "Activity"("seriesId", "date");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ActivitySeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySeries" ADD CONSTRAINT "ActivitySeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

