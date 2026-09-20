export const FOOTBALL_DATA_TIME_ZONE = 'Africa/Douala';

export type League = 'All' | 'Premier League' | 'La Liga' | 'Champions League';
export type Result = 'W' | 'D' | 'L';
export type DataSource = 'live' | 'cached' | 'demo';

export type Fixture = {
  id: string;
  league: Exclude<League, 'All'>;
  dateTime: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  homeForm: Result[];
  awayForm: Result[];
  insight: string;
  confidence: number;
  oneXtwo: { home: number; draw: number; away: number };
  overUnder: { over15: number; over25: number; under35: number };
  btts: { yes: number; no: number };
  scores: Array<{ score: string; probability: number }>;
  homeGoals: string;
  awayGoals: string;
};

export type ProviderStatus = {
  source: DataSource;
  label: string;
  description: string;
  reliableForPredictions: boolean;
};

export type FixtureQuery = {
  query: string;
  league: League;
};

export interface FootballDataProvider {
  readonly status: ProviderStatus;
  searchFixtures(query: FixtureQuery): Promise<Fixture[]>;
  refresh(): Promise<void>;
}

// All displayed schedule timestamps are generated from the current calendar
// date in Cameroon, not from a historical demo date. Douala uses UTC+01:00.
function scheduleFromToday(daysFromToday: number, kickoff: string) {
  const [hours, minutes] = kickoff.split(':').map(Number);
  const currentDoualaDate = getDoualaDateParts(new Date());
  const utcTimestamp = Date.UTC(
    currentDoualaDate.year,
    currentDoualaDate.month - 1,
    currentDoualaDate.day + daysFromToday,
    hours - 1,
    minutes,
    0,
    0,
  );

  return new Date(utcTimestamp).toISOString();
}

function getDoualaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/\b(vs?|versus)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createDemoFixtures(): Fixture[] {
  return [
    {
      id: 'bou-liv',
      league: 'Premier League',
      dateTime: scheduleFromToday(2, '15:00'),
      home: 'Bournemouth',
      away: 'Liverpool',
      homeCode: 'BOU',
      awayCode: 'LIV',
      homeForm: ['W', 'D', 'L', 'W', 'D'],
      awayForm: ['W', 'W', 'W', 'D', 'W'],
      insight: 'Liverpool’s press and chance volume create the clearest edge, but Bournemouth’s home attack keeps both teams live.',
      confidence: 78,
      oneXtwo: { home: 18, draw: 21, away: 61 },
      overUnder: { over15: 82, over25: 64, under35: 68 },
      btts: { yes: 57, no: 43 },
      scores: [{ score: '1–2', probability: 15.8 }, { score: '0–2', probability: 12.4 }, { score: '1–1', probability: 10.1 }],
      homeGoals: '1.24',
      awayGoals: '2.06',
    },
    {
      id: 'ars-ful',
      league: 'Premier League',
      dateTime: scheduleFromToday(2, '17:30'),
      home: 'Arsenal',
      away: 'Fulham',
      homeCode: 'ARS',
      awayCode: 'FUL',
      homeForm: ['W', 'W', 'W', 'D', 'W'],
      awayForm: ['D', 'L', 'W', 'D', 'L'],
      insight: 'Arsenal’s control in the final third is the dominant signal. Fulham tend to concede territory away from home.',
      confidence: 84,
      oneXtwo: { home: 69, draw: 19, away: 12 },
      overUnder: { over15: 86, over25: 61, under35: 73 },
      btts: { yes: 42, no: 58 },
      scores: [{ score: '2–0', probability: 16.4 }, { score: '2–1', probability: 12.7 }, { score: '3–0', probability: 10.9 }],
      homeGoals: '2.15',
      awayGoals: '0.76',
    },
    {
      id: 'ath-atm',
      league: 'La Liga',
      dateTime: scheduleFromToday(3, '20:00'),
      home: 'Athletic Club',
      away: 'Atlético Madrid',
      homeCode: 'ATH',
      awayCode: 'ATM',
      homeForm: ['W', 'W', 'D', 'W', 'L'],
      awayForm: ['W', 'D', 'W', 'L', 'W'],
      insight: 'A tight, low-event match profile. Athletic’s home intensity offsets Atlético’s defensive consistency.',
      confidence: 65,
      oneXtwo: { home: 36, draw: 32, away: 32 },
      overUnder: { over15: 70, over25: 39, under35: 84 },
      btts: { yes: 48, no: 52 },
      scores: [{ score: '1–1', probability: 15.1 }, { score: '1–0', probability: 12.1 }, { score: '0–1', probability: 10.8 }],
      homeGoals: '1.12',
      awayGoals: '1.08',
    },
    {
      id: 'bay-psg',
      league: 'Champions League',
      dateTime: scheduleFromToday(5, '20:00'),
      home: 'Bayern Munich',
      away: 'Paris Saint-Germain',
      homeCode: 'BAY',
      awayCode: 'PSG',
      homeForm: ['W', 'W', 'L', 'W', 'W'],
      awayForm: ['W', 'W', 'D', 'W', 'W'],
      insight: 'Two elite attacks make the goal markets more reliable than the match result. Bayern carry a narrow home advantage.',
      confidence: 71,
      oneXtwo: { home: 44, draw: 24, away: 32 },
      overUnder: { over15: 91, over25: 76, under35: 48 },
      btts: { yes: 71, no: 29 },
      scores: [{ score: '2–1', probability: 13.9 }, { score: '2–2', probability: 11.6 }, { score: '3–2', probability: 9.4 }],
      homeGoals: '1.89',
      awayGoals: '1.62',
    },
    {
      id: 'new-eve',
      league: 'Premier League',
      dateTime: scheduleFromToday(6, '19:45'),
      home: 'Newcastle',
      away: 'Everton',
      homeCode: 'NEW',
      awayCode: 'EVE',
      homeForm: ['D', 'W', 'W', 'L', 'W'],
      awayForm: ['L', 'D', 'L', 'W', 'D'],
      insight: 'Newcastle’s home tempo should stretch an Everton side that prefers a slower game state.',
      confidence: 73,
      oneXtwo: { home: 55, draw: 26, away: 19 },
      overUnder: { over15: 78, over25: 52, under35: 75 },
      btts: { yes: 51, no: 49 },
      scores: [{ score: '2–0', probability: 14.6 }, { score: '2–1', probability: 13.2 }, { score: '1–0', probability: 11.8 }],
      homeGoals: '1.65',
      awayGoals: '0.91',
    },
  ];
}

class DemoFootballDataProvider implements FootballDataProvider {
  readonly status: ProviderStatus = {
    source: 'demo',
    label: 'DEMO DATA',
    description: 'Local sample fixtures only. No live football provider is connected.',
    reliableForPredictions: false,
  };

  private fixtures = createDemoFixtures();

  async searchFixtures({ query, league }: FixtureQuery) {
    const terms = normalizeSearchTerm(query).split(' ').filter(Boolean);

    return this.fixtures.filter((fixture) => {
      const searchableText = normalizeSearchTerm(`${fixture.home} ${fixture.away} ${fixture.league}`);
      const matchesLeague = league === 'All' || fixture.league === league;
      const matchesSearch = terms.length === 0 || terms.every((term) => searchableText.includes(term));
      return matchesLeague && matchesSearch;
    });
  }

  async refresh() {
    this.fixtures = createDemoFixtures();
  }
}

// Replace this factory with a live or cached provider once the user approves
// a football data source. Keeping the contract stable prevents UI changes from
// being coupled to a particular API response shape.
export function createFootballDataProvider(): FootballDataProvider {
  return new DemoFootballDataProvider();
}

export function formatFixtureDate(dateTime: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateTime));
}

export function formatHeroDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatKickoff(dateTime: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateTime));
}

export function formatRelativeKickoff(dateTime: string) {
  const kickoff = new Date(dateTime);
  if (kickoff.getTime() <= Date.now()) return 'started';

  const today = getDoualaDateParts(new Date());
  const matchday = getDoualaDateParts(kickoff);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const matchdayUtc = Date.UTC(matchday.year, matchday.month - 1, matchday.day);
  const daysUntilKickoff = Math.round((matchdayUtc - todayUtc) / (24 * 60 * 60 * 1000));

  if (daysUntilKickoff === 0) return 'today';
  if (daysUntilKickoff === 1) return 'tomorrow';
  return `in ${daysUntilKickoff} days`;
}

export function formatModelUpdated(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
}