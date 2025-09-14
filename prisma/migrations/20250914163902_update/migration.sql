/*
  Warnings:

  - Made the column `time` on table `PassengerRotation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."PassengerRotation" ALTER COLUMN "time" SET NOT NULL;
