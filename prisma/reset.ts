import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑  Resetting database…')
  await prisma.event.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.review.deleteMany()
  await prisma.post.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  console.log('✅ Database reset complete. Run `npm run seed` to re-seed.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
