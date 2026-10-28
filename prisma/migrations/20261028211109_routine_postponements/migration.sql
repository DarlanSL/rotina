-- CreateTable
CREATE TABLE "RoutinePostponement" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutinePostponement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutinePostponement_routineId_createdAt_idx" ON "RoutinePostponement"("routineId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoutinePostponement" ADD CONSTRAINT "RoutinePostponement_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
