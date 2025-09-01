-- AlterTable
ALTER TABLE "public"."RideRequest" ADD COLUMN     "distanceCalculated" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "price" SET DEFAULT 0;
