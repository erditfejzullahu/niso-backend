-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('RIDE_RELATED', 'SUPPORT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Conversations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "rideRequestId" TEXT,
    "type" "public"."ConversationType" NOT NULL DEFAULT 'RIDE_RELATED',
    "subject" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "Conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "public"."Role" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversations_rideRequestId_key" ON "public"."Conversations"("rideRequestId");

-- CreateIndex
CREATE INDEX "Conversations_driverId_idx" ON "public"."Conversations"("driverId");

-- CreateIndex
CREATE INDEX "Conversations_passengerId_idx" ON "public"."Conversations"("passengerId");

-- CreateIndex
CREATE INDEX "Conversations_type_idx" ON "public"."Conversations"("type");

-- CreateIndex
CREATE INDEX "Conversations_isResolved_idx" ON "public"."Conversations"("isResolved");

-- CreateIndex
CREATE INDEX "Conversations_lastMessageAt_idx" ON "public"."Conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversations_driverId_passengerId_rideRequestId_key" ON "public"."Conversations"("driverId", "passengerId", "rideRequestId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "public"."Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_isRead_idx" ON "public"."Message"("isRead");

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversations" ADD CONSTRAINT "Conversations_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "public"."RideRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
