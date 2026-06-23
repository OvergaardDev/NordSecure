-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryInstructions" TEXT;
ALTER TABLE "Order" ADD COLUMN "recipientTaxId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingAddressLine1" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingAddressLine2" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCompany" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingPostalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingRegion" TEXT;
