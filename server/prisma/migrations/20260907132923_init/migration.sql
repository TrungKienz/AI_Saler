-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepositMethod" AS ENUM ('VIETQR', 'USDT');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MarginType" AS ENUM ('PERCENT', 'FIXED_USD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "displayName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "balanceVnd" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "globalMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "bankId" TEXT,
    "bankAccountNo" TEXT,
    "bankAccountName" TEXT,
    "usdtAddress" TEXT,
    "usdtNetwork" TEXT DEFAULT 'BEP20',
    "sourceApiKeyOverride" TEXT,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCache" (
    "id" TEXT NOT NULL,
    "sourceProductId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basePriceVnd" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "raw" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMargin" (
    "id" TEXT NOT NULL,
    "productCacheId" TEXT NOT NULL,
    "type" "MarginType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductMargin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "DepositMethod" NOT NULL,
    "amountVnd" INTEGER,
    "amountUsdt" DOUBLE PRECISION,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedVnd" INTEGER,
    "txHash" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productCacheId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceVnd" INTEGER NOT NULL,
    "totalPriceVnd" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "sourceOrderId" TEXT,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCache_sourceProductId_key" ON "ProductCache"("sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMargin_productCacheId_key" ON "ProductMargin"("productCacheId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_code_key" ON "Deposit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LinkCode_code_key" ON "LinkCode"("code");

-- AddForeignKey
ALTER TABLE "ProductMargin" ADD CONSTRAINT "ProductMargin_productCacheId_fkey" FOREIGN KEY ("productCacheId") REFERENCES "ProductCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productCacheId_fkey" FOREIGN KEY ("productCacheId") REFERENCES "ProductCache"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
