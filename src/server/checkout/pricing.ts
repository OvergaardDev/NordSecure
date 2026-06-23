import { priceForOrder } from '@/src/lib/campaign'

export type OrderItemLine = {
  productId: number
  quantity: number
  unitPrice: number
}

export function calculateReservedProductSubtotal(reservedIndex: number, quantity: number): number {
  let total = 0
  for (let offset = 0; offset < quantity; offset += 1) {
    total += priceForOrder(reservedIndex + offset)
  }

  return total
}

export function buildOrderItemLines(productId: number, quantity: number, totalAmount: number): OrderItemLine[] {
  if (quantity < 1) {
    return []
  }

  const baseUnitPrice = Math.floor(totalAmount / quantity)
  let remainder = totalAmount - baseUnitPrice * quantity
  const lines: OrderItemLine[] = []

  for (let index = 0; index < quantity; index += 1) {
    const extra = remainder > 0 ? 1 : 0
    lines.push({
      productId,
      quantity: 1,
      unitPrice: baseUnitPrice + extra,
    })
    remainder -= extra
  }

  return lines
}