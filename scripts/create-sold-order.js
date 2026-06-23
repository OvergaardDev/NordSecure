const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-SOLD-0001',
        customerName: 'First Unit Sold',
        customerEmail: 'sold@nordsecure.eu',
        country: 'DK',
        paymentMethod: 'crypto',
        paymentAsset: 'BTC',
        totalAmount: 400,
        vatAmount: 0,
        discountAmount: 0,
        status: 'shipped',
        isTest: false,
        items: {
          create: {
            productId: 1,
            quantity: 1,
            unitPrice: 400,
          },
        },
      },
    });
    console.log('✓ Created order:', order.orderNumber);
    const count = await prisma.order.count();
    console.log('✓ Total orders:', count);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
