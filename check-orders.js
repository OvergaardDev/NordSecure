const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const orders = await prisma.order.findMany({
    select: { id: true, totalAmount: true, paymentMethod: true, paymentAsset: true },
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(orders, null, 2));
  await prisma.$disconnect();
})();
