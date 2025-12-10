-- CreateTable
CREATE TABLE "AnswerBlockAutomationLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeAnswerBlocks" JSONB,
    "afterAnswerBlocks" JSONB,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "modelUsed" TEXT,
    "tokenEstimate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerBlockAutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerBlockAutomationLog_projectId_productId_createdAt_idx" ON "AnswerBlockAutomationLog"("projectId", "productId", "createdAt");
