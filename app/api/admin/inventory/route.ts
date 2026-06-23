import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const product = await prisma.product.findFirst()
  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const productId = Number(body.productId)
  const sku = String(body.sku ?? '').trim()
  const name = String(body.name ?? '').trim()
  const description = body.description == null ? null : String(body.description).trim()
  const imagesInput = body.images == null ? null : String(body.images)
  const standardPrice = Number(body.standardPrice)
  const standardStock = Number(body.standardStock)
  const lowStockThreshold = Number(body.lowStockThreshold)
  const maxPerOrder = Number(body.maxPerOrder)
  const isActive = Boolean(body.isActive)

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 })
  }
  if (!sku) {
    return NextResponse.json({ error: 'invalid_sku' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }
  if (!Number.isFinite(standardPrice) || standardPrice < 1) {
    return NextResponse.json({ error: 'invalid_standard_price' }, { status: 400 })
  }
  if (!Number.isFinite(standardStock) || standardStock < 0) {
    return NextResponse.json({ error: 'invalid_standard_stock' }, { status: 400 })
  }
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return NextResponse.json({ error: 'invalid_low_stock_threshold' }, { status: 400 })
  }
  if (!Number.isFinite(maxPerOrder) || maxPerOrder < 1) {
    return NextResponse.json({ error: 'invalid_max_per_order' }, { status: 400 })
  }

  let images: string | null = null
  if (imagesInput && imagesInput.trim()) {
    const parsed = imagesInput
      .split(/\r?\n|,/) 
      .map((x) => x.trim())
      .filter(Boolean)
    images = JSON.stringify(parsed)
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      sku,
      name,
      description,
      images,
      standardPrice,
      standardStock,
      lowStockThreshold,
      maxPerOrder,
      isActive,
    },
  })

  return NextResponse.json(updated)
}
