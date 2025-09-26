-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN "identifier" TEXT;

-- CreateIndex
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_method_idx" ON "RequestLog"("method");

-- CreateIndex
CREATE INDEX "RequestLog_status_idx" ON "RequestLog"("status");
