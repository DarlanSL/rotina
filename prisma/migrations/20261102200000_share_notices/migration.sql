-- CreateTable
CREATE TABLE "ShareNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lines" TEXT[],
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareNotice_userId_updatedAt_idx" ON "ShareNotice"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ShareNotice_userId_targetKey_actorId_idx" ON "ShareNotice"("userId", "targetKey", "actorId");

-- AddForeignKey
ALTER TABLE "ShareNotice" ADD CONSTRAINT "ShareNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

