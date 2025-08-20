/*
  Warnings:

  - The `ID_Card` column on the `UserInformation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."UserInformation" DROP COLUMN "ID_Card",
ADD COLUMN     "ID_Card" TEXT[];
