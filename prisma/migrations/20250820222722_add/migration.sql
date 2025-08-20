-- CreateTable
CREATE TABLE "public"."DriverFixedTarifs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixedTarifTitle" TEXT NOT NULL,
    "city" "public"."KosovoCity" NOT NULL,
    "locationArea" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverFixedTarifs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."DriverFixedTarifs" ADD CONSTRAINT "DriverFixedTarifs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
