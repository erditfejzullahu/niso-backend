-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "public"."Conversations" DROP CONSTRAINT "Conversations_driverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversations" DROP CONSTRAINT "Conversations_passengerId_fkey";

-- AlterTable
ALTER TABLE "public"."Conversations" ADD COLUMN     "adminId" TEXT,
ALTER COLUMN "driverId" DROP NOT NULL,
ALTER COLUMN "passengerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
