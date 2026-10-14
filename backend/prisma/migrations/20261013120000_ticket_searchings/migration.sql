-- CreateEnum
CREATE TYPE "TicketSearchingStatus" AS ENUM ('INPROGRESS', 'FOUND', 'NOT_FOUND', 'CANCELED');

-- CreateEnum
CREATE TYPE "TicketClass" AS ENUM ('ECONOMY', 'BUSINESS', 'BOTH');

-- CreateTable
CREATE TABLE "ticket_searchings" (
    "id" UUID NOT NULL,
    "status" "TicketSearchingStatus" NOT NULL DEFAULT 'INPROGRESS',
    "ticketClass" "TicketClass" NOT NULL DEFAULT 'BOTH',
    "date" DATE NOT NULL,
    "foundFlights" JSONB,
    "foundAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "checksCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_searchings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_searchings_status_date_idx" ON "ticket_searchings"("status", "date");

-- CreateIndex
CREATE INDEX "ticket_searchings_date_idx" ON "ticket_searchings"("date");
