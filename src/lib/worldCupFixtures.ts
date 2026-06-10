// FIFA World Cup 2026 (USA · Canada · Mexico). Final draw 2025-12-05; the six
// play-off slots were resolved in March 2026, so all 48 teams and groups are
// confirmed. Full 104-match schedule cross-checked vs Wikipedia (group +
// knockout articles, sourced to FIFA's official match schedule), FIFA, ESPN,
// Fox Sports (June 2026). All kick-off times converted to SA time (SAST,
// UTC+2); `date` is always the LOCAL match date — `nextDaySA` marks games
// that kick off in the early hours of the NEXT morning, SA time. Knockout
// participants are qualifier labels until the groups are played.

export interface WcTeam {
  name: string
  flag: string
  host?: boolean
}

export interface WcGroup {
  group: string
  teams: WcTeam[]
}

export interface WcMatch {
  match: number          // official FIFA match number (1–104)
  group?: string         // group stage only
  round?: string         // knockout only
  home: string
  away: string
  date: string           // local match date, ISO
  kickoffSA: string      // kick-off in South Africa time (SAST)
  nextDaySA?: boolean    // SA kick-off falls in the early hours of the next day
  venue: string
  city: string
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

const FLAGS: Record<string, string> = Object.fromEntries(
  WC_GROUPS.flatMap((g) => g.teams.map((t) => [t.name, t.flag])),
)

// Flag for a team name — '' for knockout qualifier labels ("Winner Group A").
export const flagOf = (team: string): string => FLAGS[team] ?? ''

// "2026-06-11" → "Thu 11 Jun"
export function wcDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

const gm = (
  match: number, group: string, home: string, away: string,
  date: string, kickoffSA: string, venue: string, city: string, nextDaySA?: boolean,
): WcMatch => ({ match, group, home, away, date, kickoffSA, venue, city, nextDaySA })

// All 72 group-stage matches (6 per group), in official match-number order.
export const WC_MATCHES: WcMatch[] = [
  gm(1,  'A', 'Mexico',          'South Africa',    '2026-06-11', '21:00', 'Estadio Azteca',          'Mexico City'),
  gm(2,  'A', 'South Korea',     'Czechia',         '2026-06-11', '04:00', 'Estadio Akron',           'Zapopan', true),
  gm(3,  'B', 'Canada',          'Bosnia & Herz.',  '2026-06-12', '21:00', 'BMO Field',               'Toronto'),
  gm(4,  'D', 'United States',   'Paraguay',        '2026-06-12', '03:00', 'SoFi Stadium',            'Inglewood', true),
  gm(5,  'C', 'Haiti',           'Scotland',        '2026-06-13', '03:00', 'Gillette Stadium',        'Foxborough', true),
  gm(6,  'D', 'Australia',       'Türkiye',         '2026-06-13', '06:00', 'BC Place',                'Vancouver', true),
  gm(7,  'C', 'Brazil',          'Morocco',         '2026-06-13', '00:00', 'MetLife Stadium',         'East Rutherford', true),
  gm(8,  'B', 'Qatar',           'Switzerland',     '2026-06-13', '21:00', "Levi's Stadium",          'Santa Clara'),
  gm(9,  'E', 'Ivory Coast',     'Ecuador',         '2026-06-14', '01:00', 'Lincoln Financial Field', 'Philadelphia', true),
  gm(10, 'E', 'Germany',         'Curaçao',         '2026-06-14', '19:00', 'NRG Stadium',             'Houston'),
  gm(11, 'F', 'Netherlands',     'Japan',           '2026-06-14', '22:00', 'AT&T Stadium',            'Arlington'),
  gm(12, 'F', 'Sweden',          'Tunisia',         '2026-06-14', '04:00', 'Estadio BBVA',            'Guadalupe', true),
  gm(13, 'H', 'Saudi Arabia',    'Uruguay',         '2026-06-15', '00:00', 'Hard Rock Stadium',       'Miami Gardens', true),
  gm(14, 'H', 'Spain',           'Cape Verde',      '2026-06-15', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  gm(15, 'G', 'Iran',            'New Zealand',     '2026-06-15', '03:00', 'SoFi Stadium',            'Inglewood', true),
  gm(16, 'G', 'Belgium',         'Egypt',           '2026-06-15', '21:00', 'Lumen Field',             'Seattle'),
  gm(17, 'I', 'France',          'Senegal',         '2026-06-16', '21:00', 'MetLife Stadium',         'East Rutherford'),
  gm(18, 'I', 'Iraq',            'Norway',          '2026-06-16', '00:00', 'Gillette Stadium',        'Foxborough', true),
  gm(19, 'J', 'Argentina',       'Algeria',         '2026-06-16', '03:00', 'Arrowhead Stadium',       'Kansas City', true),
  gm(20, 'J', 'Austria',         'Jordan',          '2026-06-16', '06:00', "Levi's Stadium",          'Santa Clara', true),
  gm(21, 'L', 'Ghana',           'Panama',          '2026-06-17', '01:00', 'BMO Field',               'Toronto', true),
  gm(22, 'L', 'England',         'Croatia',         '2026-06-17', '22:00', 'AT&T Stadium',            'Arlington'),
  gm(23, 'K', 'Portugal',        'DR Congo',        '2026-06-17', '19:00', 'NRG Stadium',             'Houston'),
  gm(24, 'K', 'Uzbekistan',      'Colombia',        '2026-06-17', '04:00', 'Estadio Azteca',          'Mexico City', true),
  gm(25, 'A', 'Czechia',         'South Africa',    '2026-06-18', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  gm(26, 'B', 'Switzerland',     'Bosnia & Herz.',  '2026-06-18', '21:00', 'SoFi Stadium',            'Inglewood'),
  gm(27, 'B', 'Canada',          'Qatar',           '2026-06-18', '00:00', 'BC Place',                'Vancouver', true),
  gm(28, 'A', 'Mexico',          'South Korea',     '2026-06-18', '03:00', 'Estadio Akron',           'Zapopan', true),
  gm(29, 'C', 'Brazil',          'Haiti',           '2026-06-19', '02:30', 'Lincoln Financial Field', 'Philadelphia', true),
  gm(30, 'C', 'Scotland',        'Morocco',         '2026-06-19', '00:00', 'Gillette Stadium',        'Foxborough', true),
  gm(31, 'D', 'Türkiye',         'Paraguay',        '2026-06-19', '05:00', "Levi's Stadium",          'Santa Clara', true),
  gm(32, 'D', 'United States',   'Australia',       '2026-06-19', '21:00', 'Lumen Field',             'Seattle'),
  gm(33, 'E', 'Germany',         'Ivory Coast',     '2026-06-20', '22:00', 'BMO Field',               'Toronto'),
  gm(34, 'E', 'Ecuador',         'Curaçao',         '2026-06-20', '02:00', 'Arrowhead Stadium',       'Kansas City', true),
  gm(35, 'F', 'Netherlands',     'Sweden',          '2026-06-20', '19:00', 'NRG Stadium',             'Houston'),
  gm(36, 'F', 'Tunisia',         'Japan',           '2026-06-20', '06:00', 'Estadio BBVA',            'Guadalupe', true),
  gm(37, 'H', 'Uruguay',         'Cape Verde',      '2026-06-21', '00:00', 'Hard Rock Stadium',       'Miami Gardens', true),
  gm(38, 'H', 'Spain',           'Saudi Arabia',    '2026-06-21', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  gm(39, 'G', 'Belgium',         'Iran',            '2026-06-21', '21:00', 'SoFi Stadium',            'Inglewood'),
  gm(40, 'G', 'New Zealand',     'Egypt',           '2026-06-21', '03:00', 'BC Place',                'Vancouver', true),
  gm(41, 'I', 'Norway',          'Senegal',         '2026-06-22', '02:00', 'MetLife Stadium',         'East Rutherford', true),
  gm(42, 'I', 'France',          'Iraq',            '2026-06-22', '23:00', 'Lincoln Financial Field', 'Philadelphia'),
  gm(43, 'J', 'Argentina',       'Austria',         '2026-06-22', '19:00', 'AT&T Stadium',            'Arlington'),
  gm(44, 'J', 'Jordan',          'Algeria',         '2026-06-22', '05:00', "Levi's Stadium",          'Santa Clara', true),
  gm(45, 'L', 'England',         'Ghana',           '2026-06-23', '22:00', 'Gillette Stadium',        'Foxborough'),
  gm(46, 'L', 'Panama',          'Croatia',         '2026-06-23', '01:00', 'BMO Field',               'Toronto', true),
  gm(47, 'K', 'Portugal',        'Uzbekistan',      '2026-06-23', '19:00', 'NRG Stadium',             'Houston'),
  gm(48, 'K', 'Colombia',        'DR Congo',        '2026-06-23', '04:00', 'Estadio Akron',           'Zapopan', true),
  gm(49, 'C', 'Scotland',        'Brazil',          '2026-06-24', '00:00', 'Hard Rock Stadium',       'Miami Gardens', true),
  gm(50, 'C', 'Morocco',         'Haiti',           '2026-06-24', '00:00', 'Mercedes-Benz Stadium',   'Atlanta', true),
  gm(51, 'B', 'Switzerland',     'Canada',          '2026-06-24', '21:00', 'BC Place',                'Vancouver'),
  gm(52, 'B', 'Bosnia & Herz.',  'Qatar',           '2026-06-24', '21:00', 'Lumen Field',             'Seattle'),
  gm(53, 'A', 'Czechia',         'Mexico',          '2026-06-24', '03:00', 'Estadio Azteca',          'Mexico City', true),
  gm(54, 'A', 'South Africa',    'South Korea',     '2026-06-24', '03:00', 'Estadio BBVA',            'Guadalupe', true),
  gm(55, 'E', 'Curaçao',         'Ivory Coast',     '2026-06-25', '22:00', 'Lincoln Financial Field', 'Philadelphia'),
  gm(56, 'E', 'Ecuador',         'Germany',         '2026-06-25', '22:00', 'MetLife Stadium',         'East Rutherford'),
  gm(57, 'F', 'Japan',           'Sweden',          '2026-06-25', '01:00', 'AT&T Stadium',            'Arlington', true),
  gm(58, 'F', 'Tunisia',         'Netherlands',     '2026-06-25', '01:00', 'Arrowhead Stadium',       'Kansas City', true),
  gm(59, 'D', 'Türkiye',         'United States',   '2026-06-25', '04:00', 'SoFi Stadium',            'Inglewood', true),
  gm(60, 'D', 'Paraguay',        'Australia',       '2026-06-25', '04:00', "Levi's Stadium",          'Santa Clara', true),
  gm(61, 'I', 'Norway',          'France',          '2026-06-26', '21:00', 'Gillette Stadium',        'Foxborough'),
  gm(62, 'I', 'Senegal',         'Iraq',            '2026-06-26', '21:00', 'BMO Field',               'Toronto'),
  gm(63, 'G', 'Egypt',           'Iran',            '2026-06-26', '05:00', 'Lumen Field',             'Seattle', true),
  gm(64, 'G', 'New Zealand',     'Belgium',         '2026-06-26', '05:00', 'BC Place',                'Vancouver', true),
  gm(65, 'H', 'Cape Verde',      'Saudi Arabia',    '2026-06-26', '02:00', 'NRG Stadium',             'Houston', true),
  gm(66, 'H', 'Uruguay',         'Spain',           '2026-06-26', '02:00', 'Estadio Akron',           'Zapopan', true),
  gm(67, 'L', 'Panama',          'England',         '2026-06-27', '23:00', 'MetLife Stadium',         'East Rutherford'),
  gm(68, 'L', 'Croatia',         'Ghana',           '2026-06-27', '23:00', 'Lincoln Financial Field', 'Philadelphia'),
  gm(69, 'J', 'Algeria',         'Austria',         '2026-06-27', '04:00', 'Arrowhead Stadium',       'Kansas City', true),
  gm(70, 'J', 'Jordan',          'Argentina',       '2026-06-27', '04:00', 'AT&T Stadium',            'Arlington', true),
  gm(71, 'K', 'Colombia',        'Portugal',        '2026-06-27', '01:30', 'Hard Rock Stadium',       'Miami Gardens', true),
  gm(72, 'K', 'DR Congo',        'Uzbekistan',      '2026-06-27', '01:30', 'Mercedes-Benz Stadium',   'Atlanta', true),
]

const km = (
  round: string, match: number, home: string, away: string,
  date: string, kickoffSA: string, venue: string, city: string, nextDaySA?: boolean,
): WcMatch => ({ match, round, home, away, date, kickoffSA, venue, city, nextDaySA })

// All 32 knockout matches. Participants are qualifier labels until the groups finish.
export const WC_KNOCKOUT_MATCHES: WcMatch[] = [
  km('Round of 32', 73, 'Runner-up Group A',  'Runner-up Group B',     '2026-06-28', '21:00', 'SoFi Stadium',            'Inglewood'),
  km('Round of 32', 74, 'Winner Group E',     '3rd Group A/B/C/D/F',   '2026-06-29', '22:30', 'Gillette Stadium',        'Foxborough'),
  km('Round of 32', 75, 'Winner Group F',     'Runner-up Group C',     '2026-06-29', '03:00', 'Estadio BBVA',            'Guadalupe', true),
  km('Round of 32', 76, 'Winner Group C',     'Runner-up Group F',     '2026-06-29', '19:00', 'NRG Stadium',             'Houston'),
  km('Round of 32', 77, 'Winner Group I',     '3rd Group C/D/F/G/H',   '2026-06-30', '23:00', 'MetLife Stadium',         'East Rutherford'),
  km('Round of 32', 78, 'Runner-up Group E',  'Runner-up Group I',     '2026-06-30', '19:00', 'AT&T Stadium',            'Arlington'),
  km('Round of 32', 79, 'Winner Group A',     '3rd Group C/E/F/H/I',   '2026-06-30', '03:00', 'Estadio Azteca',          'Mexico City', true),
  km('Round of 32', 80, 'Winner Group L',     '3rd Group E/H/I/J/K',   '2026-07-01', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  km('Round of 32', 81, 'Winner Group D',     '3rd Group B/E/F/I/J',   '2026-07-01', '02:00', "Levi's Stadium",          'Santa Clara', true),
  km('Round of 32', 82, 'Winner Group G',     '3rd Group A/E/H/I/J',   '2026-07-01', '22:00', 'Lumen Field',             'Seattle'),
  km('Round of 32', 83, 'Runner-up Group K',  'Runner-up Group L',     '2026-07-02', '01:00', 'BMO Field',               'Toronto', true),
  km('Round of 32', 84, 'Winner Group H',     'Runner-up Group J',     '2026-07-02', '21:00', 'SoFi Stadium',            'Inglewood'),
  km('Round of 32', 85, 'Winner Group B',     '3rd Group E/F/G/I/J',   '2026-07-02', '05:00', 'BC Place',                'Vancouver', true),
  km('Round of 32', 86, 'Winner Group J',     'Runner-up Group H',     '2026-07-03', '00:00', 'Hard Rock Stadium',       'Miami Gardens', true),
  km('Round of 32', 87, 'Winner Group K',     '3rd Group D/E/I/J/L',   '2026-07-03', '03:30', 'Arrowhead Stadium',       'Kansas City', true),
  km('Round of 32', 88, 'Runner-up Group D',  'Runner-up Group G',     '2026-07-03', '20:00', 'AT&T Stadium',            'Arlington'),
  km('Round of 16', 89, 'Winner Match 74',    'Winner Match 77',       '2026-07-04', '23:00', 'Lincoln Financial Field', 'Philadelphia'),
  km('Round of 16', 90, 'Winner Match 73',    'Winner Match 75',       '2026-07-04', '19:00', 'NRG Stadium',             'Houston'),
  km('Round of 16', 91, 'Winner Match 76',    'Winner Match 78',       '2026-07-05', '22:00', 'MetLife Stadium',         'East Rutherford'),
  km('Round of 16', 92, 'Winner Match 79',    'Winner Match 80',       '2026-07-05', '02:00', 'Estadio Azteca',          'Mexico City', true),
  km('Round of 16', 93, 'Winner Match 83',    'Winner Match 84',       '2026-07-06', '21:00', 'AT&T Stadium',            'Arlington'),
  km('Round of 16', 94, 'Winner Match 81',    'Winner Match 82',       '2026-07-06', '02:00', 'Lumen Field',             'Seattle', true),
  km('Round of 16', 95, 'Winner Match 86',    'Winner Match 88',       '2026-07-07', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  km('Round of 16', 96, 'Winner Match 85',    'Winner Match 87',       '2026-07-07', '22:00', 'BC Place',                'Vancouver'),
  km('Quarter-finals', 97,  'Winner Match 89',  'Winner Match 90',     '2026-07-09', '22:00', 'Gillette Stadium',        'Foxborough'),
  km('Quarter-finals', 98,  'Winner Match 93',  'Winner Match 94',     '2026-07-10', '21:00', 'SoFi Stadium',            'Inglewood'),
  km('Quarter-finals', 99,  'Winner Match 91',  'Winner Match 92',     '2026-07-11', '23:00', 'Hard Rock Stadium',       'Miami Gardens'),
  km('Quarter-finals', 100, 'Winner Match 95',  'Winner Match 96',     '2026-07-11', '03:00', 'Arrowhead Stadium',       'Kansas City', true),
  km('Semi-finals', 101, 'Winner Match 97',   'Winner Match 98',       '2026-07-14', '21:00', 'AT&T Stadium',            'Arlington'),
  km('Semi-finals', 102, 'Winner Match 99',   'Winner Match 100',      '2026-07-15', '21:00', 'Mercedes-Benz Stadium',   'Atlanta'),
  km('Third place', 103, 'Loser Match 101',   'Loser Match 102',       '2026-07-18', '23:00', 'Hard Rock Stadium',       'Miami Gardens'),
  km('FINAL', 104, 'Winner Match 101',        'Winner Match 102',      '2026-07-19', '21:00', 'MetLife Stadium',         'East Rutherford'),
]

// Knockout rounds in bracket order, for the "Road to the Final" list.
export const WC_KO_ROUNDS = [
  { round: 'Round of 32',    dateLabel: '28 Jun – 3 Jul', blurb: 'New round for the 48-team format' },
  { round: 'Round of 16',    dateLabel: '4 – 7 Jul',      blurb: 'Last sixteen, straight knockout' },
  { round: 'Quarter-finals', dateLabel: '9 – 11 Jul',     blurb: 'Boston · Los Angeles · Miami · Kansas City' },
  { round: 'Semi-finals',    dateLabel: '14 – 15 Jul',    blurb: 'Dallas (Arlington) · Atlanta' },
  { round: 'Third place',    dateLabel: '18 Jul',         blurb: 'Hard Rock Stadium, Miami' },
  { round: 'FINAL',          dateLabel: '19 Jul',         blurb: 'MetLife Stadium, New Jersey' },
]

// A group's 6 fixtures in date order.
export const groupMatches = (group: string): WcMatch[] =>
  WC_MATCHES
    .filter((m) => m.group === group)
    .sort((a, b) => a.date.localeCompare(b.date) || a.match - b.match)

// A knockout round's fixtures in date order.
export const roundMatches = (round: string): WcMatch[] =>
  WC_KNOCKOUT_MATCHES
    .filter((m) => m.round === round)
    .sort((a, b) => a.date.localeCompare(b.date) || a.match - b.match)

// Bafana Bafana's three confirmed group games.
export const WC_SA_MATCHES = groupMatches(WC_SA_GROUP).filter(
  (m) => m.home === 'South Africa' || m.away === 'South Africa',
)
