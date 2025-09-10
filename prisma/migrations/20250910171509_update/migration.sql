/*
  Warnings:

  - The `carModel` column on the `UserInformation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."CarBrand" AS ENUM ('BMW', 'AUDI', 'MERCEDES', 'VOLKSWAGEN', 'TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'NISSAN', 'HYUNDAI', 'KIA', 'VOLVO', 'TESLA', 'FIAT', 'RENAULT', 'PEUGEOT', 'CITROEN', 'SKODA', 'SEAT', 'OPEL', 'MAZDA', 'JEEP', 'PORSCHE', 'LAMBORGHINI', 'FERRARI', 'BENTLEY', 'ROLLS_ROYCE', 'ASTON_MARTIN', 'BUGATTI', 'MCLAREN', 'LAND_ROVER', 'JAGUAR', 'SUZUKI', 'MITSUBISHI', 'SUBARU', 'INFINITI', 'ACURA', 'LEXUS', 'DODGE', 'RAM', 'GMC', 'CHRYSLER', 'LINCOLN', 'CADILLAC');

-- CreateEnum
CREATE TYPE "public"."CarColor" AS ENUM ('BARDHE', 'ZEZË', 'ARGJENDI', 'HIRI', 'KALTËR', 'KUQE', 'GJELBËR', 'VERDHË', 'PORTOKALLI', 'KAFE', 'BEZHË', 'AR', 'VJOLLCË', 'ROZË', 'GESHTENJË', 'TURKEZ', 'GURKALI', 'DETI');

-- AlterTable
ALTER TABLE "public"."UserInformation" ADD COLUMN     "carColor" "public"."CarColor",
ADD COLUMN     "carYear" INTEGER,
DROP COLUMN "carModel",
ADD COLUMN     "carModel" "public"."CarBrand";
