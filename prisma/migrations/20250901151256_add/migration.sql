/*
  Warnings:

  - You are about to drop the column `distanceCalculated` on the `RideRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RideRequest" DROP COLUMN "distanceCalculated",
ADD COLUMN     "distanceCalculatedPriceRide" BOOLEAN NOT NULL DEFAULT false;
