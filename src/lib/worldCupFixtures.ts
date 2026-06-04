// FIFA World Cup 2026 (USA · Canada · Mexico). Final draw 2025-12-05; the six
// play-off slots were resolved in March 2026, so all 48 teams and groups are
// confirmed. Knockout PARTICIPANTS are not yet known (groups not played) — only
// dates, venues and bracket logic are fixed. Cross-checked vs Wikipedia, FIFA,
// ESPN, NBC Sports (June 2026).

export interface WcTeam {
  name: string
  flag: string
  host?: boolean
}

export interface WcGroup {
  group: string
  teams: WcTeam[]
}

export interface WcRound {
  round: string
  dateLabel: string
  detail: string
}

export const WC_INFO = {
  teams: 48,
  groups: 12,
  matches: 104,
  dateLabel: '11 Jun – 19 Jul 2026',
  hosts: 'USA · Canada · Mexico',
  opening: 'Mexico 🇲🇽 vs South Africa 🇿🇦 — Estadio Azteca, Mexico City (11 Jun)',
  final: 'MetLife Stadium, New Jersey — 19 Jul 2026',
  format: 'Top 2 of each group + 8 best 3rd-placed → Round of 32, then straight knockout.',
}

// South Africa (Bafana Bafana) are in Group A — and play in the opening match.
export const WC_SA_GROUP = 'A'

export const WC_GROUPS: WcGroup[] = [
  { group: 'A', teams: [
    { name: 'Mexico', flag: '🇲🇽', host: true }, { name: 'South Africa', flag: '🇿🇦' },
    { name: 'South Korea', flag: '🇰🇷' }, { name: 'Czechia', flag: '🇨🇿' },
  ] },
  { group: 'B', teams: [
    { name: 'Canada', flag: '🇨🇦', host: true }, { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'Qatar', flag: '🇶🇦' }, { name: 'Bosnia & Herz.', flag: '🇧🇦' },
  ] },
  { group: 'C', teams: [
    { name: 'Brazil', flag: '🇧🇷' }, { name: 'Morocco', flag: '🇲🇦' },
    { name: 'Haiti', flag: '🇭🇹' }, { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ] },
  { group: 'D', teams: [
    { name: 'United States', flag: '🇺🇸', host: true }, { name: 'Paraguay', flag: '🇵🇾' },
    { name: 'Australia', flag: '🇦🇺' }, { name: 'Türkiye', flag: '🇹🇷' },
  ] },
  { group: 'E', teams: [
    { name: 'Germany', flag: '🇩🇪' }, { name: 'Ecuador', flag: '🇪🇨' },
    { name: 'Ivory Coast', flag: '🇨🇮' }, { name: 'Curaçao', flag: '🇨🇼' },
  ] },
  { group: 'F', teams: [
    { name: 'Netherlands', flag: '🇳🇱' }, { name: 'Japan', flag: '🇯🇵' },
    { name: 'Tunisia', flag: '🇹🇳' }, { name: 'Sweden', flag: '🇸🇪' },
  ] },
  { group: 'G', teams: [
    { name: 'Belgium', flag: '🇧🇪' }, { name: 'Egypt', flag: '🇪🇬' },
    { name: 'Iran', flag: '🇮🇷' }, { name: 'New Zealand', flag: '🇳🇿' },
  ] },
  { group: 'H', teams: [
    { name: 'Spain', flag: '🇪🇸' }, { name: 'Uruguay', flag: '🇺🇾' },
    { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Cape Verde', flag: '🇨🇻' },
  ] },
  { group: 'I', teams: [
    { name: 'France', flag: '🇫🇷' }, { name: 'Senegal', flag: '🇸🇳' },
    { name: 'Norway', flag: '🇳🇴' }, { name: 'Iraq', flag: '🇮🇶' },
  ] },
  { group: 'J', teams: [
    { name: 'Argentina', flag: '🇦🇷' }, { name: 'Austria', flag: '🇦🇹' },
    { name: 'Algeria', flag: '🇩🇿' }, { name: 'Jordan', flag: '🇯🇴' },
  ] },
  { group: 'K', teams: [
    { name: 'Portugal', flag: '🇵🇹' }, { name: 'Colombia', flag: '🇨🇴' },
    { name: 'Uzbekistan', flag: '🇺🇿' }, { name: 'DR Congo', flag: '🇨🇩' },
  ] },
  { group: 'L', teams: [
    { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name: 'Croatia', flag: '🇭🇷' },
    { name: 'Ghana', flag: '🇬🇭' }, { name: 'Panama', flag: '🇵🇦' },
  ] },
]

// Bafana Bafana's confirmed group-stage involvement (Group A, all in June).
export const WC_SA_FIXTURES = [
  { dateLabel: 'Thu 11 Jun', text: 'Mexico 🇲🇽 vs South Africa 🇿🇦', venue: 'Estadio Azteca, Mexico City', note: 'Tournament opening match' },
  { dateLabel: 'Group A · Jun', text: 'South Africa 🇿🇦 vs South Korea 🇰🇷', venue: 'USA / Mexico (date TBC)', note: '' },
  { dateLabel: 'Group A · Jun', text: 'South Africa 🇿🇦 vs Czechia 🇨🇿', venue: 'USA / Mexico (date TBC)', note: '' },
]

export const WC_KNOCKOUT: WcRound[] = [
  { round: 'Group Stage', dateLabel: '11–27 Jun', detail: '72 matches across all 12 groups' },
  { round: 'Round of 32', dateLabel: '28 Jun – 3 Jul', detail: '16 matches — new round for the 48-team format' },
  { round: 'Round of 16', dateLabel: '4–7 Jul', detail: '8 matches' },
  { round: 'Quarter-finals', dateLabel: '9–11 Jul', detail: 'Boston · Los Angeles · Miami · Kansas City' },
  { round: 'Semi-finals', dateLabel: '14–15 Jul', detail: 'Dallas (Arlington) · Atlanta' },
  { round: 'Third-place', dateLabel: '18 Jul', detail: 'Hard Rock Stadium, Miami' },
  { round: 'FINAL', dateLabel: '19 Jul', detail: 'MetLife Stadium, New Jersey' },
]
