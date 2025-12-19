-- CreateEnum
CREATE TYPE "MediaFixDraftType" AS ENUM ('IMAGE_ALT_TEXT', 'IMAGE_CAPTION');

-- CreateEnum
CREATE TYPE "MediaFixApplyTarget" AS ENUM ('IMAGE_ALT', 'CAPTION_FIELD');

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMediaFixDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "draftType" "MediaFixDraftType" NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "aiWorkKey" TEXT NOT NULL,
    "reusedFromWorkKey" TEXT,
    "generatedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMediaFixDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMediaFixApplication" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "appliedByUserId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "draftType" "MediaFixDraftType" NOT NULL,
    "applyTarget" "MediaFixApplyTarget" NOT NULL,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMediaFixApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_externalId_key" ON "ProductImage"("productId", "externalId");

-- CreateIndex
CREATE INDEX "ProductMediaFixDraft_productId_imageId_draftType_idx" ON "ProductMediaFixDraft"("productId", "imageId", "draftType");

-- CreateIndex
CREATE INDEX "ProductMediaFixDraft_aiWorkKey_idx" ON "ProductMediaFixDraft"("aiWorkKey");

-- CreateIndex
CREATE INDEX "ProductMediaFixDraft_productId_expiresAt_idx" ON "ProductMediaFixDraft"("productId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductMediaFixApplication_productId_appliedAt_idx" ON "ProductMediaFixApplication"("productId", "appliedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductMediaFixApplication_appliedByUserId_appliedAt_idx" ON "ProductMediaFixApplication"("appliedByUserId", "appliedAt" DESC);

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMediaFixDraft" ADD CONSTRAINT "ProductMediaFixDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMediaFixApplication" ADD CONSTRAINT "ProductMediaFixApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMediaFixApplication" ADD CONSTRAINT "ProductMediaFixApplication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ProductMediaFixDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMediaFixApplication" ADD CONSTRAINT "ProductMediaFixApplication_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
