import { cookies } from 'next/headers'
import { prisma } from '@/src/lib/prisma'
import { createAdminToken, getAdminPassword, isAdminAuthConfigured } from '@/src/lib/auth'
import { RouteError } from '@/src/server/routeErrors'
import {
  getBooleanField,
  getDateField,
  getNumberField,
  getOptionalStringField,
  getPositiveIntegerField,
  getStringField,
  requireRecord,
} from '@/src/server/input'
import { countAnalyticsEventsByType } from '@/src/shared/analyticsEvents'

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const
const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const
const COUPON_DISCOUNT_TYPES = ['percent', 'fixed'] as const

type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number]

type InventoryUpdateCommand = {
  productId: number
  sku: string
  name: string
  description: string | null
  images: string | null
  standardPrice: number
  standardStock: number
  lowStockThreshold: number
  maxPerOrder: number
  isActive: boolean
}

type CouponCreateCommand = {
  code: string
  description: string | null
  discountType: CouponDiscountType
  discountValue: number
  minOrderAmount: number | null
  maxUses: number | null
  startsAt: Date | null
  expiresAt: Date | null
  active: boolean
}

type CouponUpdateCommand = {
  id: number
  updates: Record<string, unknown>
}

type PostUpsertCommand = {
  title: string
  slug: string
  content: string
  excerpt?: string
  tags: string | null
  status: string
  featuredImage?: string
}

function normalizeCouponCode(input: string) {
  return input.trim().toUpperCase()
}

function parseTagList(input: unknown): string | null {
  if (input == null || input === '') return null

  if (Array.isArray(input)) {
    const tags = input
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean)
    return tags.length ? JSON.stringify(tags) : null
  }

  if (typeof input === 'string') {
    const raw = input.trim()
    if (!raw) return null

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) throw new Error('invalid')
        const tags = parsed
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
        return tags.length ? JSON.stringify(tags) : null
      } catch {
        throw new RouteError(400, 'invalid_tags')
      }
    }

    const tags = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    return tags.length ? JSON.stringify(tags) : null
  }

  throw new RouteError(400, 'invalid_tags')
}

function parseImagesInput(input: unknown) {
  if (input == null) return null

  const raw = String(input).trim()
  if (!raw) return null

  const parsed = raw
    .split(/\r?\n|,/) 
    .map((value) => value.trim())
    .filter(Boolean)

  return parsed.length ? JSON.stringify(parsed) : null
}

function validateDiscountType(value: string): CouponDiscountType {
  if ((COUPON_DISCOUNT_TYPES as readonly string[]).includes(value)) {
    return value as CouponDiscountType
  }

  throw new RouteError(400, 'invalid_discount_type')
}

export function parseAdminLoginCommand(payload: unknown) {
  const body = requireRecord(payload)
  return { password: getStringField(body, 'password', { required: true }) }
}

export async function createAdminSession(password: string) {
  const expected = getAdminPassword()
  if (!isAdminAuthConfigured() || !expected) {
    throw new RouteError(503, 'admin_auth_not_configured')
  }
  if (password !== expected) {
    throw new RouteError(401, 'invalid')
  }

  return createAdminToken()
}

export function clearAdminSession() {
  cookies().delete('admin_session')
}

export async function listOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })
}

export async function getOrder(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  })
  if (!order) throw new RouteError(404, 'not_found')
  return order
}

export function parseOrderStatusUpdateCommand(payload: unknown) {
  const body = requireRecord(payload)
  const status = getStringField(body, 'status', { required: true })
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new RouteError(400, 'invalid_status')
  }
  return { status }
}

export async function updateOrderStatus(id: number, status: string) {
  return prisma.order.update({ where: { id }, data: { status } })
}

export async function getInventoryProduct() {
  const product = await prisma.product.findFirst()
  if (!product) throw new RouteError(404, 'product_not_found')
  return product
}

export function parseInventoryUpdateCommand(payload: unknown): InventoryUpdateCommand {
  const body = requireRecord(payload)

  return {
    productId: getPositiveIntegerField(body, 'productId'),
    sku: getStringField(body, 'sku', { required: true }),
    name: getStringField(body, 'name', { required: true }),
    description: getOptionalStringField(body, 'description') ?? null,
    images: parseImagesInput(body.images),
    standardPrice: getNumberField(body, 'standardPrice', { required: true, min: 1 })!,
    standardStock: getNumberField(body, 'standardStock', { required: true, min: 0 })!,
    lowStockThreshold: getNumberField(body, 'lowStockThreshold', { required: true, min: 0 })!,
    maxPerOrder: getNumberField(body, 'maxPerOrder', { required: true, min: 1 })!,
    isActive: getBooleanField(body, 'isActive', false) ?? false,
  }
}

export async function updateInventoryProduct(command: InventoryUpdateCommand) {
  return prisma.product.update({
    where: { id: command.productId },
    data: command,
  })
}

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
}

export function parseCouponCreateCommand(payload: unknown): CouponCreateCommand {
  const body = requireRecord(payload)
  const code = normalizeCouponCode(getStringField(body, 'code', { required: true }))
  if (code.length < 3) throw new RouteError(400, 'invalid_code')

  const discountType = validateDiscountType(getStringField(body, 'discountType', { required: true }).toLowerCase())
  const discountValue = getNumberField(body, 'discountValue', { required: true, min: 1 })!
  if (discountType === 'percent' && discountValue > 100) {
    throw new RouteError(400, 'percent_too_high')
  }

  const minOrderAmount = getNumberField(body, 'minOrderAmount', { min: 0 }) ?? null
  const maxUses = getNumberField(body, 'maxUses', { min: 1 }) ?? null

  return {
    code,
    description: getOptionalStringField(body, 'description') ?? null,
    discountType,
    discountValue,
    minOrderAmount,
    maxUses,
    startsAt: getDateField(body, 'startsAt'),
    expiresAt: getDateField(body, 'expiresAt'),
    active: getBooleanField(body, 'active', true) ?? true,
  }
}

export async function createCoupon(command: CouponCreateCommand) {
  try {
    return await prisma.coupon.create({ data: command })
  } catch {
    throw new RouteError(400, 'coupon_create_failed')
  }
}

export function parseCouponUpdateCommand(payload: unknown): CouponUpdateCommand {
  const body = requireRecord(payload)
  const id = getPositiveIntegerField(body, 'id')
  const updates: Record<string, unknown> = {}

  if (body.code != null) {
    const code = normalizeCouponCode(getStringField(body, 'code', { required: true }))
    if (code.length < 3) throw new RouteError(400, 'invalid_code')
    updates.code = code
  }

  if (body.description !== undefined) {
    updates.description = getOptionalStringField(body, 'description') ?? null
  }

  if (body.discountType != null) {
    const discountType = validateDiscountType(getStringField(body, 'discountType', { required: true }).toLowerCase())
    updates.discountType = discountType
  }

  if (body.discountValue != null) {
    const discountValue = getNumberField(body, 'discountValue', { required: true, min: 1 })!
    const nextType = String(updates.discountType ?? body.discountType ?? '').toLowerCase()
    if (nextType === 'percent' && discountValue > 100) {
      throw new RouteError(400, 'percent_too_high')
    }
    updates.discountValue = discountValue
  }

  if (body.minOrderAmount !== undefined) {
    updates.minOrderAmount = getNumberField(body, 'minOrderAmount', { min: 0 }) ?? null
  }

  if (body.maxUses !== undefined) {
    updates.maxUses = getNumberField(body, 'maxUses', { min: 1 }) ?? null
  }

  if (body.active !== undefined) {
    updates.active = getBooleanField(body, 'active', true)
  }

  if (body.startsAt !== undefined) {
    updates.startsAt = getDateField(body, 'startsAt')
  }

  if (body.expiresAt !== undefined) {
    updates.expiresAt = getDateField(body, 'expiresAt')
  }

  return { id, updates }
}

export async function updateCoupon(command: CouponUpdateCommand) {
  try {
    return await prisma.coupon.update({ where: { id: command.id }, data: command.updates })
  } catch {
    throw new RouteError(400, 'coupon_update_failed')
  }
}

export function parseCouponDeleteCommand(payload: unknown) {
  const body = requireRecord(payload)
  return { id: getPositiveIntegerField(body, 'id') }
}

export async function deleteCoupon(id: number) {
  await prisma.coupon.delete({ where: { id } })
  return { ok: true }
}

export async function listPosts() {
  return prisma.post.findMany({ orderBy: { createdAt: 'desc' } })
}

export function parsePostCreateCommand(payload: unknown): PostUpsertCommand {
  const body = requireRecord(payload)
  return {
    title: getStringField(body, 'title', { required: true }),
    slug: getStringField(body, 'slug', { required: true }),
    content: getStringField(body, 'content', { required: true }),
    excerpt: getOptionalStringField(body, 'excerpt'),
    tags: parseTagList(body.tags),
    status: getStringField(body, 'status') || 'draft',
    featuredImage: getOptionalStringField(body, 'featuredImage'),
  }
}

export async function createPost(command: PostUpsertCommand) {
  return prisma.post.create({
    data: {
      ...command,
      excerpt: command.excerpt ?? null,
      featuredImage: command.featuredImage ?? null,
      publishedAt: command.status === 'published' ? new Date() : null,
    },
  })
}

export async function getPost(id: number) {
  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) throw new RouteError(404, 'not_found')
  return post
}

export function parsePostUpdateCommand(payload: unknown): PostUpsertCommand {
  const body = requireRecord(payload)
  return {
    title: getStringField(body, 'title', { required: true }),
    slug: getStringField(body, 'slug', { required: true }),
    content: getStringField(body, 'content', { required: true }),
    excerpt: getOptionalStringField(body, 'excerpt'),
    tags: parseTagList(body.tags),
    status: getStringField(body, 'status') || 'draft',
    featuredImage: getOptionalStringField(body, 'featuredImage'),
  }
}

export async function updatePost(id: number, command: PostUpsertCommand) {
  return prisma.post.update({
    where: { id },
    data: {
      ...command,
      excerpt: command.excerpt ?? null,
      featuredImage: command.featuredImage ?? null,
      publishedAt: command.status === 'published' ? new Date() : undefined,
    },
  })
}

export async function deletePost(id: number) {
  await prisma.post.delete({ where: { id } })
  return { ok: true }
}

export function parseReviewStatusUpdateCommand(payload: unknown) {
  const body = requireRecord(payload)
  const status = getStringField(body, 'status', { required: true })
  if (!(REVIEW_STATUSES as readonly string[]).includes(status)) {
    throw new RouteError(400, 'invalid')
  }
  return { status }
}

export async function updateReviewStatus(id: number, status: string) {
  return prisma.review.update({ where: { id }, data: { status } })
}

export function parseAnalyticsQuery(url: string) {
  const { searchParams } = new URL(url)
  const range = searchParams.get('range') ?? '30d'
  const includeTest = searchParams.get('includeTest') === 'true'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  return { includeTest, since: new Date(Date.now() - days * 86400000) }
}

export async function getAnalytics(query: { includeTest: boolean; since: Date }) {
  const [orders, events] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: query.since },
        ...(query.includeTest ? {} : { isTest: false }),
      },
      include: { items: true },
    }),
    prisma.event.findMany({ where: { createdAt: { gte: query.since } } }),
  ])

  const paidOrders = orders.filter((order) => order.status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const aov = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0

  const revenueMap = new Map<string, number>()
  for (const order of paidOrders) {
    const day = order.createdAt.toISOString().slice(0, 10)
    revenueMap.set(day, (revenueMap.get(day) ?? 0) + order.totalAmount)
  }

  const counts = countAnalyticsEventsByType(events)
  const pageViews = counts.page_view
  const productViews = counts.product_view
  const checkoutStarts = counts.checkout_start
  const purchases = counts.purchase

  const countryMap = new Map<string, number>()
  for (const order of paidOrders) {
    countryMap.set(order.country, (countryMap.get(order.country) ?? 0) + 1)
  }

  return {
    totalRevenue,
    aov,
    orderCount: paidOrders.length,
    revenueByDay: Array.from(revenueMap.entries()).map(([date, revenue]) => ({ date, revenue })),
    funnel: [
      { step: 'Page views', count: pageViews },
      { step: 'Product views', count: productViews },
      { step: 'Checkout starts', count: checkoutStarts },
      { step: 'Purchases', count: purchases },
    ],
    conversionRates: {
      visitorToProductView: pageViews ? ((productViews / pageViews) * 100).toFixed(1) : '0',
      productViewToCheckout: productViews ? ((checkoutStarts / productViews) * 100).toFixed(1) : '0',
      checkoutToPurchase: checkoutStarts ? ((purchases / checkoutStarts) * 100).toFixed(1) : '0',
      overall: pageViews ? ((purchases / pageViews) * 100).toFixed(1) : '0',
    },
    countries: Array.from(countryMap.entries()).map(([country, count]) => ({ country, count })),
  }
}