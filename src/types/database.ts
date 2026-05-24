export type EventStatus = 'open' | 'closed' | 'settled'
export type TransactionType = 'allocation' | 'bet' | 'payout' | 'refund'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface CasinoEvent {
  id: string
  created_by: string
  event_name: string
  description: string | null
  unit: string
  category: string
  closing_time: string
  status: EventStatus
  created_at: string
  updated_at: string
}

export interface EventWithResult extends CasinoEvent {
  actual_result: number | null
  total_tokens_bet: number | null
  total_score: number | null
  settled_at: string | null
  settled_by: string | null
}

export interface Bet {
  id: string
  user_id: string
  event_id: string
  prediction: number
  amount: number
  score: number | null
  payout: number | null
  placed_at: string
  updated_at: string
}

export interface BetWithProfile extends Bet {
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export interface MonthlyAllocation {
  id: string
  user_id: string
  year: number
  month: number
  tokens_allocated: number
  created_at: string
}

export interface EventResult {
  id: string
  event_id: string
  actual_result: number
  total_tokens_bet: number
  total_score: number
  settled_by: string
  settled_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  reference_id: string | null
  reference_type: string | null
  description: string
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  year: number
  month: number
  tokens_won: number
  tokens_wagered: number
  bets_placed: number
  rank: number
}

export interface YearlyLeaderboardEntry {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  year: number
  tokens_won: number
  tokens_wagered: number
  bets_placed: number
  rank: number
}
