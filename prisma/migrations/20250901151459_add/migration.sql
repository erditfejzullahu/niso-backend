/*
  Warnings:

  - Added the required column `distanceKm` to the `RideRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."RideRequest" ADD COLUMN     "distanceKm" TEXT NOT NULL;
