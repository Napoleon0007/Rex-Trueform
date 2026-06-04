// Springbok (South Africa men's national rugby team) 2026 season.
// Sourced/cross-checked from press reports (SA Rugby Mag, RugbyWorld, The South
// African, The Citizen) in June 2026. Some away-tour venues for the Nov Nations
// Championship window were not yet city-confirmed at time of writing.

export type Venue = 'H' | 'A' | 'N' // home / away / neutral

export interface RugbyFixture {
  iso: string        // ISO date for sorting (best-known Saturday for weekend windows)
  dateLabel: string  // human label, e.g. "Sat 4 Jul"
  opponent: string
  flag: string
  comp: string
  venue: string
  city: string
  ha: Venue
}

export interface FixtureBlock {
  series: string
  note?: string
  fixtures: RugbyFixture[]
}

export const SPRINGBOK_SEASON = '2026'

export const SPRINGBOK_FIXTURES: FixtureBlock[] = [
  {
    series: 'Season Opener',
    fixtures: [
      {
        iso: '2026-06-20', dateLabel: 'Sat 20 Jun', opponent: 'Barbarians', flag: '🏉',
        comp: 'Invitational', venue: 'Nelson Mandela Bay Stadium', city: 'Gqeberha', ha: 'H',
      },
    ],
  },
  {
    series: 'July — Nations Championship (home)',
    fixtures: [
      {
        iso: '2026-07-04', dateLabel: 'Sat 4 Jul', opponent: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        comp: 'Nations Championship', venue: 'Ellis Park', city: 'Johannesburg', ha: 'H',
      },
      {
        iso: '2026-07-11', dateLabel: 'Sat 11 Jul', opponent: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
        comp: 'Nations Championship', venue: 'Loftus Versfeld', city: 'Pretoria', ha: 'H',
      },
      {
        iso: '2026-07-18', dateLabel: 'Sat 18 Jul', opponent: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
        comp: 'Nations Championship', venue: 'Kings Park', city: 'Durban', ha: 'H',
      },
    ],
  },
  {
    series: 'Aug–Sep — All Blacks Series',
    note: 'A rare four-Test series against New Zealand.',
    fixtures: [
      {
        iso: '2026-08-22', dateLabel: 'Sat 22 Aug', opponent: 'New Zealand', flag: '🇳🇿',
        comp: 'Test Series', venue: 'Ellis Park', city: 'Johannesburg', ha: 'H',
      },
      {
        iso: '2026-08-29', dateLabel: 'Sat 29 Aug', opponent: 'New Zealand', flag: '🇳🇿',
        comp: 'Test Series', venue: 'Cape Town Stadium', city: 'Cape Town', ha: 'H',
      },
      {
        iso: '2026-09-05', dateLabel: 'Sat 5 Sep', opponent: 'New Zealand', flag: '🇳🇿',
        comp: 'Test Series', venue: 'FNB Stadium', city: 'Johannesburg', ha: 'H',
      },
      {
        iso: '2026-09-12', dateLabel: 'Sat 12 Sep', opponent: 'New Zealand', flag: '🇳🇿',
        comp: 'Test Series', venue: 'M&T Bank Stadium', city: 'Baltimore, USA', ha: 'N',
      },
    ],
  },
  {
    series: 'September — Down Under',
    fixtures: [
      {
        iso: '2026-09-27', dateLabel: 'Sun 27 Sep', opponent: 'Australia', flag: '🇦🇺',
        comp: 'Test', venue: 'Optus Stadium', city: 'Perth', ha: 'A',
      },
    ],
  },
  {
    series: 'November — Nations Championship (away tour)',
    fixtures: [
      {
        iso: '2026-11-07', dateLabel: 'Wknd 6–8 Nov', opponent: 'Italy', flag: '🇮🇹',
        comp: 'Nations Championship', venue: 'TBC', city: 'Italy', ha: 'A',
      },
      {
        iso: '2026-11-14', dateLabel: 'Wknd 13–15 Nov', opponent: 'France', flag: '🇫🇷',
        comp: 'Nations Championship', venue: 'TBC', city: 'France', ha: 'A',
      },
      {
        iso: '2026-11-21', dateLabel: 'Sat 21 Nov', opponent: 'Ireland', flag: '🇮🇪',
        comp: 'Nations Championship', venue: 'Aviva Stadium', city: 'Dublin', ha: 'A',
      },
      {
        iso: '2026-11-28', dateLabel: '27–29 Nov', opponent: 'Finals Weekend', flag: '🏆',
        comp: 'Nations Championship Finals', venue: 'Allianz Stadium', city: 'London (if qualified)', ha: 'N',
      },
    ],
  },
]
