-- CreateTable
CREATE TABLE "ActivityShare" (
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyBefore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityShare_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE "ListShare" (
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListShare_pkey" PRIMARY KEY ("listId","userId")
);

-- CreateIndex
CREATE INDEX "ActivityShare_userId_idx" ON "ActivityShare"("userId");

-- CreateIndex
CREATE INDEX "ListShare_userId_idx" ON "ListShare"("userId");

-- AddForeignKey
ALTER TABLE "ActivityShare" ADD CONSTRAINT "ActivityShare_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityShare" ADD CONSTRAINT "ActivityShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListShare" ADD CONSTRAINT "ListShare_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListShare" ADD CONSTRAINT "ListShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

