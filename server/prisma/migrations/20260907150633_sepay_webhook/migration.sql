-- CreateEnum
CREATE TYPE "ConfirmSource" AS ENUM ('ADMIN', 'WEBHOOK');

-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "sepayWebhookApiKey" TEXT;

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "confirmedBy" "ConfirmSource";

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "gateway" TEXT,
    "accountNumber" TEXT,
    "transferAmount" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "referenceCode" TEXT,
    "matchedDepositId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_externalId_key" ON "BankTransaction"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_matchedDepositId_key" ON "BankTransaction"("matchedDepositId");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedDepositId_fkey" FOREIGN KEY ("matchedDepositId") REFERENCES "Deposit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
