// The in-game currency is the Rex Trueform token ($TRUEF) — a REAL Solana coin
// launched on pump.fun. IMPORTANT: the balances in this app are PLAY-MONEY that
// Luke manages in Supabase. No real $TRUEF ever moves on-chain through the game;
// we only DISPLAY the live price/market cap (read-only) for flavour and to point
// players at the real coin. Wiring real deposits/withdrawals here would turn it
// into real-money gambling — don't.
export const TOKEN_MINT = 'GA9WPiXPoP53mCVhwBYus1J7GcVgCWgHsrqc7m1bpump'

export const TOKEN_NAME = 'Truth Tokens'        // friendly name for the in-game currency
export const TOKEN_TICKER = 'TRUEF'             // exchange ticker (shown as $TRUEF)
export const TOKEN_COIN_NAME = 'Rex Trueform coin'
export const TOKEN_GLYPH = 'Ŧ'                  // inline currency mark (replaces the old Bitcoin ₿)
export const TOKEN_COLOR = '#f5b301'            // brand gold for the glyph/accents

// Where a tap on the price ticker / balance sends you to buy the real coin.
export const PUMP_FUN_URL = `https://pump.fun/coin/${TOKEN_MINT}`
