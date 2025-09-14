/*
  Warnings:

  - The `days` column on the `PassengerRotation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."RotationDays" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "public"."PassengerRotation" DROP COLUMN "days",
ADD COLUMN     "days" "public"."RotationDays"[];
