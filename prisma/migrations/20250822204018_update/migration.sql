-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "priceOffer" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Conversations_driverId_isResolved_idx" ON "public"."Conversations"("driverId", "isResolved");
