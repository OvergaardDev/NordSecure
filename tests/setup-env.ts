if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db'
}

if (!process.env.PAYMENT_MODE) {
  process.env.PAYMENT_MODE = 'demo'
}