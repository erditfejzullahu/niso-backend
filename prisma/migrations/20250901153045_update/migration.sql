/*
  Warnings:

  - Changed the type of `distanceKm` on the `RideRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."RideRequest" DROP COLUMN "distanceKm",
ADD COLUMN     "distanceKm" DECIMAL(10,2) NOT NULL;
