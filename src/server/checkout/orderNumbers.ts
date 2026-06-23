import type { Prisma } from '@prisma/client'

function randomSuffix(length: number) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length).toUpperCase()
}

export function generateOrderNumber(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `ORD-${year}${month}${day}-${randomSuffix(8)}`
}

export function isOrderNumberUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: string; meta?: { target?: unknown } }
  if (record.code !== 'P2002') return false

  const target = record.meta?.target
  if (!Array.isArray(target)) return false
  return target.includes('orderNumber')
}

export async function createOrderWithGeneratedNumber(
  tx: Prisma.TransactionClient,
  buildData: (orderNumber: string) => Prisma.OrderCreateInput,
  maxAttempts = 5
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const orderNumber = generateOrderNumber()

    try {
      return await tx.order.create({
        data: buildData(orderNumber),
        include: { items: true },
      })
    } catch (error) {
      if (!isOrderNumberUniqueConflict(error) || attempt === maxAttempts - 1) {
        throw error
      }
    }
  }

  throw new Error('order_number_generation_failed')
}