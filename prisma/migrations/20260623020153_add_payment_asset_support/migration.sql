-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'crypto',
    "paymentAsset" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "shippingPhone" TEXT,
    "shippingCompany" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingRegion" TEXT,
    "shippingPostalCode" TEXT,
    "deliveryInstructions" TEXT,
    "recipientTaxId" TEXT,
    "customerId" INTEGER,
    "country" TEXT NOT NULL,
    "vatAmount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("country", "createdAt", "customerEmail", "customerId", "customerName", "deliveryInstructions", "id", "isTest", "orderNumber", "recipientTaxId", "shippingAddressLine1", "shippingAddressLine2", "shippingCity", "shippingCompany", "shippingPhone", "shippingPostalCode", "shippingRegion", "status", "totalAmount", "vatAmount") SELECT "country", "createdAt", "customerEmail", "customerId", "customerName", "deliveryInstructions", "id", "isTest", "orderNumber", "recipientTaxId", "shippingAddressLine1", "shippingAddressLine2", "shippingCity", "shippingCompany", "shippingPhone", "shippingPostalCode", "shippingRegion", "status", "totalAmount", "vatAmount" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE TABLE "new_Reservation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "productSku" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'crypto',
    "paymentAsset" TEXT,
    "reservedIndex" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Reservation" ("createdAt", "expiresAt", "id", "productId", "productSku", "quantity", "reservedIndex", "sessionId") SELECT "createdAt", "expiresAt", "id", "productId", "productSku", "quantity", "reservedIndex", "sessionId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
