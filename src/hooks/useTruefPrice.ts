import { useQuery } from '@tanstack/react-query'
import { TOKEN_MINT } from '../lib/token'

// Live $TRUEF price from DexScreener's free public API (no key, CORS-enabled).
// DexScreener indexes pump.fun bonding-curve tokens as well as graduated ones,
// so this works whether or not the coin has migrated to a DEX. Read-only — it
// only powers the on-screen ticker and the "what's my stack worth" gag.
export interface TruefPrice {
  price: number      // USD per token
  change24h: number  // % change over the last 24h
  marketCap: number  // USD
}

export function useTruefPrice() {
  return useQuery<TruefPrice>({
    queryKey: ['truef-price', TOKEN_MINT],
    staleTime: 45_000,
    refetchInterval: 45_000,
    queryFn: async () => {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`)
      if (!res.ok) throw new Error('price fetch failed')
      const json = await res.json()

      const pairs: any[] = Array.isArray(json?.pairs) ? json.pairs : []
      if (pairs.length === 0) throw new Error('no trading pair yet')

      // Most-liquid pair wins (a Raydium pool once it graduates, otherwise the
      // pump.fun bonding curve) so the price tracks where the real volume is.
      const pair = pairs
        .slice()
        .sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0))[0]

      const price = Number(pair?.priceUsd)
      const marketCap = Number(pair?.marketCap ?? pair?.fdv)
      const change24h = Number(pair?.priceChange?.h24 ?? 0)
      if (!Number.isFinite(price)) throw new Error('bad price payload')

      return {
        price,
        change24h: Number.isFinite(change24h) ? change24h : 0,
        marketCap: Number.isFinite(marketCap) ? marketCap : 0,
      }
    },
  })
}
