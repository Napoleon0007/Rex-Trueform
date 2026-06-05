import { useQuery } from '@tanstack/react-query'

// Live BTC/USD spot price from Coinbase's public API (no key, CORS-enabled).
// Used to show the "dollar value" of a member's ₿ stack — for a laugh.
export function useBtcPrice() {
  return useQuery({
    queryKey: ['btc-usd-spot'],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      if (!res.ok) throw new Error('price fetch failed')
      const json = await res.json()
      const amount = Number(json?.data?.amount)
      if (!Number.isFinite(amount)) throw new Error('bad price payload')
      return amount
    },
  })
}
