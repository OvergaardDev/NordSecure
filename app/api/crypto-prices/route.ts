import { NextResponse } from 'next/server'

// Map our assets to CoinGecko IDs
const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin',
  ltc: 'litecoin',
  xmr: 'monero',
  sol: 'solana',
}

const COIN_SYMBOLS: Record<string, string> = {
  btc: '₿',
  ltc: 'Ł',
  xmr: '🔐',
  sol: '◎',
}

export async function GET(req: Request) {
  try {
    const assets = ['btc', 'ltc', 'xmr', 'sol']
    const coinGeckoIds = assets.map(a => COIN_IDS[a]).join(',')

    // Fetch live prices from CoinGecko API (free, no auth)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds}&vs_currencies=eur&include_market_cap=false&include_24hr_vol=false`,
      {
        headers: { 'Accept': 'application/json' },
        // Cache for 1 minute since prices update frequently
        next: { revalidate: 60 }
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch prices from CoinGecko' },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Transform to our format
    const prices: Record<string, { eur: number; symbol: string; name: string }> = {}
    for (const asset of assets) {
      const geckoId = COIN_IDS[asset]
      const priceEur = data[geckoId]?.eur
      if (priceEur !== undefined) {
        prices[asset] = {
          eur: priceEur,
          symbol: COIN_SYMBOLS[asset],
          name: asset.toUpperCase(),
        }
      }
    }

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
  } catch (error) {
    console.error('Crypto price fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto prices' },
      { status: 500 }
    )
  }
}
