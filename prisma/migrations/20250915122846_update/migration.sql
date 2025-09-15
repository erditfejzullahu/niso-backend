/*
  Warnings:

  - You are about to drop the column `adminId` on the `Conversations` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Conversations" DROP CONSTRAINT "Conversations_adminId_fkey";

-- AlterTable
ALTER TABLE "public"."Conversations" DROP COLUMN "adminId",
ADD COLUMN     "supportId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
