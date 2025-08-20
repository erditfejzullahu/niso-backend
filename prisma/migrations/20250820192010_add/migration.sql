/*
  Warnings:

  - Added the required column `address` to the `UserInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `UserInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `UserInformation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."KosovoCity" AS ENUM ('Prishtinë', 'Prizren', 'Ferizaj', 'Gjakovë', 'Pejë', 'Mitrovicë', 'Gjilan', 'Podujevë', 'Obiliq', 'Fushë Kosovë', 'Drenas', 'Skenderaj', 'Vushtrri', 'Lipjan', 'Shtime', 'Suharekë', 'Rahovec', 'Dragash', 'Malishevë', 'Kaçanik', 'Hani i Elezit', 'Kamenicë', 'Viti', 'Graçanicë', 'Shtërpcë', 'Kllokot', 'Novobërdë', 'Ranillug', 'Partesh', 'Junik', 'Klinë', 'Istog', 'Deçan', 'Zubin Potok', 'Zveçan', 'Leposaviq', 'Mitrovicë e Veriut', 'Mamushë');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'RATHER_NOT_SAY');

-- AlterTable
ALTER TABLE "public"."UserInformation" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "city" "public"."KosovoCity" NOT NULL,
ADD COLUMN     "gender" "public"."Gender" NOT NULL;
