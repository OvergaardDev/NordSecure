import type { Prisma } from '@prisma/client'

export const confirmedSaleStatuses = ['paid', 'shipped'] as const

export function includeTestOrdersForStorefront() {
  // Storefront inventory/progress should always reflect real sales only.
  // Test orders are visible in admin but must not consume public campaign units.
  return false
}

export function soldCountWhere(includeTestOrders: boolean): Prisma.OrderWhereInput {
  return {
    status: { in: [...confirmedSaleStatuses] },
    ...(includeTestOrders ? {} : { isTest: false })
  }
}
