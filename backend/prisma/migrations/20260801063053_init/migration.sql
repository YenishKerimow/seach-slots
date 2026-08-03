-- CreateEnum
CREATE TYPE "SearchingStatus" AS ENUM ('INPROGRESS', 'FOUND', 'CANCELED');

-- CreateEnum
CREATE TYPE "SearchingType" AS ENUM ('USUAL', 'VIP', 'STUDENT');

-- CreateTable
CREATE TABLE "searchings" (
    "id" UUID NOT NULL,
    "status" "SearchingStatus" NOT NULL DEFAULT 'INPROGRESS',
    "type" "SearchingType" NOT NULL DEFAULT 'USUAL',
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "searchings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "searchings_status_idx" ON "searchings"("status");

-- CreateIndex
CREATE INDEX "searchings_date_idx" ON "searchings"("date");
