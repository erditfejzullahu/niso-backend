-- CreateIndex
CREATE INDEX "DriverEarning_driverId_paymentDate_idx" ON "public"."DriverEarning"("driverId", "paymentDate");

-- CreateIndex
CREATE INDEX "PassengerPayment_passengerId_paidAt_idx" ON "public"."PassengerPayment"("passengerId", "paidAt");
