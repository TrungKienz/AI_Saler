-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductCache" ADD COLUMN     "isHot" BOOLEAN NOT NULL DEFAULT false;
