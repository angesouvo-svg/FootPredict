export const FOOTBALL_DATA_TIME_ZONE = 'Africa/Douala';

export type League = 'All' | 'Premier League' | 'La Liga' | 'Champions League' | 'Bundesliga' | 'Serie A' | 'Ligue 1';
export type Result = 'W' | 'D' | 'L';
export type DataSource = 'live' | 'cached' | 'unavailable';

export type Probability = number | null;

export type TeamStats = {
  matches: number;
  form: Result[];
  goalsFor: number | null;
  goalsAgainst: number | null;
  averageGoalsFor: number | null;
  averageGoalsAgainst: number | null;
  over15: Probability;
  over25: Probability;
  under35: Probability;
  btts: { yes: Probability; no: Probability };
  cleanSheets: Probability;
};

export type StandingsEntry = {
  position: number;
  points: number;
  played: number;
  goalDifference: number;
};

export type H2HMatch = {
  dateTime: string;
  home: string;
  away: string;
  score: string;
};

export type PredictionMarket = {
  label: string;
  probability: number;
  market: string;
};

export type MatchAnalysis = {
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeVenueStats: TeamStats;
  awayVenueStats: TeamStats;
  oneXtwo: { home: Probability; draw: Probability; away: Probability };
  doubleChance: { homeOrDraw: Probability; drawOrAway: Probability; homeOrAway: Probability };
  overUnder: { over15: Probability; over25: Probability; under35: Probability };
  btts: { yes: Probability; no: Probability };
  scores: Array<{ score: string; probability: number }>;
  expectedGoals: { home: Probability; away: Probability };
  standings: { home: StandingsEntry | null; away: StandingsEntry | null };
  headToHead: H2HMatch[];
  injuries: { available: false; reason: string };
  primaryPrediction: PredictionMarket | null;
  secondaryMarkets: PredictionMarket[];
  confidence: Probability;
  insight: string;
  unavailable: string[];
};

export type Fixture = {
  id: string;
  league: Exclude<League, 'All'>;
  dateTime: string;
  status: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  homeTeamId: number;
  awayTeamId: number;
  competitionCode: string;
  analysis: MatchAnalysis | null;
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

type ApiEnvelope = {
  source: DataSource;
  label: string;
  description: string;
  lastUpdated: string | null;
  fixtures: Fixture[];
  error?: string;
};

export interface FootballDataProvider {
  readonly status: ProviderStatus;
  searchFixtures(query: FixtureQuery): Promise<{ status: ProviderStatus; lastUpdated: string | null; fixtures: Fixture[]; error?: string }>;
  getFixtureAnalysis(fixtureId: string): Promise<{ status: ProviderStatus; fixture: Fixture | null; error?: string }>;
  refresh(): Promise<void>;
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

function getInitialStatus(): ProviderStatus {
  return {
    source: 'live',
    label: 'LIVE DATA',
    description: 'Fixtures and match data are served from football-data.org.',
    reliableForPredictions: true,
  };
}

function unavailableStatus(): ProviderStatus {
  return {
    source: 'unavailable',
    label: 'DATA SOURCE UNAVAILABLE',
    description: 'The live football provider is not configured or cannot be reached.',
    reliableForPredictions: false,
  };
}

function cachedStatus(): ProviderStatus {
  return {
    source: 'cached',
    label: 'CACHED DATA',
    description: 'Showing recently verified football data while the live provider is unavailable.',
    reliableForPredictions: true,
  };
}

class FootballApiDataProvider implements FootballDataProvider {
  private lastStatus = getInitialStatus();

  get status() {
    return this.lastStatus;
  }

  async searchFixtures({ query, league }: FixtureQuery) {
    const params = new URLSearchParams({ query, league });
    const response = await fetch(`/api/football/fixtures?${params.toString()}`, { headers: { Accept: 'application/json' } });
    const envelope = (await response.json()) as ApiEnvelope;
    this.lastStatus = {
      source: envelope.source,
      label: envelope.label,
      description: envelope.description,
      reliableForPredictions: envelope.source !== 'unavailable',
    };

    if (!response.ok) {
      throw new Error(envelope.error ?? this.lastStatus.description);
    }

    return {
      status: this.lastStatus,
      lastUpdated: envelope.lastUpdated,
      fixtures: envelope.fixtures,
      error: envelope.error,
    };
  }

  async getFixtureAnalysis(fixtureId: string) {
    const response = await fetch(`/api/football/fixtures/${encodeURIComponent(fixtureId)}`, {
      headers: { Accept: 'application/json' },
    });
    const envelope = (await response.json()) as { source: DataSource; label: string; description: string; fixture: Fixture | null; error?: string };
    this.lastStatus = {
      source: envelope.source,
      label: envelope.label,
      description: envelope.description,
      reliableForPredictions: envelope.source !== 'unavailable',
    };

    if (!response.ok) {
      throw new Error(envelope.error ?? this.lastStatus.description);
    }

    return { status: this.lastStatus, fixture: envelope.fixture, error: envelope.error };
  }

  async refresh() {
    await fetch('/api/football/refresh', { method: 'POST', headers: { Accept: 'application/json' } });
  }
}

export function createFootballDataProvider(): FootballDataProvider {
  return new FootballApiDataProvider();
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

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const matchday = new Intl.DateTimeFormat('en-CA', {
    timeZone: FOOTBALL_DATA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(kickoff);
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  const matchdayUtc = Date.parse(`${matchday}T00:00:00Z`);
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

export function normalizeFixtureSearch(value: string) {
  return normalizeSearchTerm(value);
}