-- CreateTable
CREATE TABLE "AnswerBlock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'generated',
    "sourceFieldsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" TEXT NOT NULL DEFAULT 'ae_v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerBlock_productId_idx" ON "AnswerBlock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerBlock_productId_questionId_key" ON "AnswerBlock"("productId", "questionId");

-- AddForeignKey
ALTER TABLE "AnswerBlock" ADD CONSTRAINT "AnswerBlock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
