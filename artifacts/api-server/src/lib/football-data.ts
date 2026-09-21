import { logger } from "./logger";

const API_BASE_URL = "https://api.football-data.org/v4";
const CACHE_TTL_MS = 5 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const TIME_ZONE = "Africa/Douala";
const FIXTURE_WINDOW_DAYS = 9;

export type DataSource = "live" | "cached" | "unavailable";
export type League = "All" | "Premier League" | "La Liga" | "Champions League" | "Bundesliga" | "Serie A" | "Ligue 1";
export type Result = "W" | "D" | "L";
export type Probability = number | null;

export type ProviderStatus = {
  source: DataSource;
  label: string;
  description: string;
};

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

export type Fixture = {
  id: string;
  league: Exclude<League, "All">;
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
  standings: { home: Standing | null; away: Standing | null };
  headToHead: H2HMatch[];
  injuries: { available: false; reason: string };
  primaryPrediction: PredictionMarket | null;
  secondaryMarkets: PredictionMarket[];
  confidence: Probability;
  insight: string;
  unavailable: string[];
};

export type Standing = {
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

export type FootballResponse = {
  source: DataSource;
  label: string;
  description: string;
  lastUpdated: string | null;
  fixtures: Fixture[];
  error?: string;
};

type RawTeam = { id?: number; name?: string; shortName?: string; tla?: string };
type RawScore = { fullTime?: { home?: number | null; away?: number | null } };
type RawMatch = {
  id?: number;
  utcDate?: string;
  status?: string;
  homeTeam?: RawTeam;
  awayTeam?: RawTeam;
  competition?: { code?: string; name?: string };
  score?: RawScore;
};
type RawMatchesResponse = { matches?: RawMatch[] };
type RawStanding = { position?: number; points?: number; playedGames?: number; goalDifference?: number; team?: RawTeam };
type RawStandingsResponse = { standings?: Array<{ type?: string; table?: RawStanding[] }> };

const competitions: Array<{ code: string; league: Exclude<League, "All"> }> = [
  { code: "PL", league: "Premier League" },
  { code: "PD", league: "La Liga" },
  { code: "BL1", league: "Bundesliga" },
  { code: "SA", league: "Serie A" },
  { code: "FL1", league: "Ligue 1" },
  { code: "CL", league: "Champions League" },
];
const fixtureStatuses = new Set(["SCHEDULED", "TIMED", "LIVE", "IN_PLAY", "PAUSED"]);

const responseCache = new Map<string, { expiresAt: number; value: unknown }>();
let fixturesCache: { expiresAt: number; fixtures: Fixture[]; lastUpdated: string } | null = null;
let lastGoodFixtures: { fixtures: Fixture[]; lastUpdated: string } | null = null;

function status(source: DataSource): ProviderStatus {
  if (source === "live") {
    return { source, label: "LIVE DATA", description: "Fixtures and match data are served from football-data.org." };
  }
  if (source === "cached") {
    return { source, label: "CACHED DATA", description: "Showing recently verified football data while the live provider is unavailable." };
  }
  return { source, label: "DATA SOURCE UNAVAILABLE", description: "The football provider is not configured or cannot be reached. No demo fixtures are being shown." };
}

function dateInDouala(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateOffset(date: Date, days: number) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return dateInDouala(value);
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—-]/g, " ")
    .replace(/\b(vs?|versus)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function competitionFor(code?: string, name?: string): Exclude<League, "All"> | null {
  const byCode = competitions.find((item) => item.code === code);
  if (byCode) return byCode.league;
  const lower = name?.toLowerCase() ?? "";
  if (lower.includes("premier")) return "Premier League";
  if (lower.includes("champions")) return "Champions League";
  if (lower.includes("liga")) return "La Liga";
  if (lower.includes("bundesliga")) return "Bundesliga";
  if (lower.includes("serie a")) return "Serie A";
  if (lower.includes("ligue 1")) return "Ligue 1";
  return null;
}

function toFixture(match: RawMatch): Fixture | null {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const league = competitionFor(match.competition?.code, match.competition?.name);
  if (!match.id || !match.utcDate || !home?.id || !away?.id || !home.name || !away.name || !league) return null;
  return {
    id: String(match.id),
    league,
    dateTime: match.utcDate,
    status: match.status ?? "SCHEDULED",
    home: home.name,
    away: away.name,
    homeCode: home.tla ?? home.shortName?.slice(0, 3).toUpperCase() ?? "HOM",
    awayCode: away.tla ?? away.shortName?.slice(0, 3).toUpperCase() ?? "AWY",
    homeTeamId: home.id,
    awayTeamId: away.id,
    competitionCode: match.competition?.code ?? "",
    analysis: null,
  };
}

async function fetchApi<T>(path: string, ttlMs = DETAIL_CACHE_TTL_MS): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not configured");

  const cached = responseCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  logger.info({ provider: "football-data.org", configured: true, path }, "Football provider request");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const body = await response.text();
    logger.warn({ status: response.status, path, body: body.slice(0, 500) }, "Football provider returned an error");
    throw new Error(`football-data.org returned ${response.status}`);
  }
  const value = (await response.json()) as T;
  responseCache.set(path, { expiresAt: Date.now() + ttlMs, value });
  return value;
}

async function loadFixtures() {
  if (fixturesCache && fixturesCache.expiresAt > Date.now()) {
    return { source: "live" as DataSource, fixtures: fixturesCache.fixtures, lastUpdated: fixturesCache.lastUpdated };
  }

  const today = new Date();
  const dateFrom = dateInDouala(today);
  const dateTo = dateOffset(today, FIXTURE_WINDOW_DAYS);
  logger.info({
    provider: "football-data.org",
    nowIso: today.toISOString(),
    timeZone: TIME_ZONE,
    dateFrom,
    dateTo,
    competitionCodes: competitions.map((item) => item.code),
    retrieval: "competition subresources",
  }, "Loading current football fixtures");

  try {
    const responses = await Promise.allSettled(competitions.map(async (competition) => {
      const query = new URLSearchParams({ dateFrom, dateTo, limit: "100" });
      const payload = await fetchApi<RawMatchesResponse>(`/competitions/${competition.code}/matches?${query.toString()}`, CACHE_TTL_MS);
      return { competition, matches: payload.matches ?? [] };
    }));
    const successfulResponses = responses.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failedCompetitions = responses.flatMap((result, index) => result.status === "rejected" ? [competitions[index].code] : []);
    if (successfulResponses.length === 0) {
      throw new Error("football-data.org returned no accessible competition feeds");
    }
    const rawMatches = successfulResponses.flatMap((result) => result.matches);
    logger.info({
      provider: "football-data.org",
      dateFrom,
      dateTo,
      returnedMatches: rawMatches.length,
      returnedCompetitionCodes: [...new Set(rawMatches.map((match) => match.competition?.code).filter(Boolean))],
      failedCompetitions,
      sampleDates: rawMatches.slice(0, 5).map((match) => match.utcDate).filter(Boolean),
    }, "Football fixture response received");
    const fixtures = rawMatches.flatMap((match) => {
      const matchDate = match.utcDate ? dateInDouala(new Date(match.utcDate)) : null;
      if (!matchDate || matchDate < dateFrom || matchDate > dateTo || !fixtureStatuses.has(match.status ?? "")) return [];
      const fixture = toFixture(match);
      return fixture ? [fixture] : [];
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    const lastUpdated = new Date().toISOString();
    fixturesCache = { expiresAt: Date.now() + CACHE_TTL_MS, fixtures, lastUpdated };
    lastGoodFixtures = { fixtures, lastUpdated };
    return { source: "live" as DataSource, fixtures, lastUpdated };
  } catch (error) {
    logger.warn({ err: error }, "Football fixture provider unavailable");
    if (lastGoodFixtures) return { source: "cached" as DataSource, ...lastGoodFixtures };
    throw error;
  }
}

function emptyStats(): TeamStats {
  return {
    matches: 0,
    form: [],
    goalsFor: null,
    goalsAgainst: null,
    averageGoalsFor: null,
    averageGoalsAgainst: null,
    over15: null,
    over25: null,
    under35: null,
    btts: { yes: null, no: null },
    cleanSheets: null,
  };
}

type CompletedMatch = {
  dateTime: string;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
};

function toCompletedMatches(payload: RawMatchesResponse) {
  return (payload.matches ?? [])
    .flatMap((match): CompletedMatch[] => {
      const homeGoals = match.score?.fullTime?.home;
      const awayGoals = match.score?.fullTime?.away;
      if (!match.utcDate || !match.homeTeam?.id || !match.awayTeam?.id || !match.homeTeam.name || !match.awayTeam.name || typeof homeGoals !== "number" || typeof awayGoals !== "number") return [];
      return [{
        dateTime: match.utcDate,
        homeId: match.homeTeam.id,
        awayId: match.awayTeam.id,
        homeName: match.homeTeam.name,
        awayName: match.awayTeam.name,
        homeGoals,
        awayGoals,
      }];
    })
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

function buildTeamStats(teamId: number, matches: CompletedMatch[], venue?: "home" | "away"): TeamStats {
  const filtered = matches.filter((match) => venue === "home" ? match.homeId === teamId : venue === "away" ? match.awayId === teamId : match.homeId === teamId || match.awayId === teamId).slice(0, 10);
  if (!filtered.length) return emptyStats();
  let goalsFor = 0;
  let goalsAgainst = 0;
  let over15 = 0;
  let over25 = 0;
  let under35 = 0;
  let btts = 0;
  let cleanSheets = 0;
  const form: Result[] = [];

  for (const match of filtered) {
    const isHome = match.homeId === teamId;
    const scored = isHome ? match.homeGoals : match.awayGoals;
    const conceded = isHome ? match.awayGoals : match.homeGoals;
    goalsFor += scored;
    goalsAgainst += conceded;
    form.push(scored > conceded ? "W" : scored === conceded ? "D" : "L");
    if (scored + conceded > 1.5) over15 += 1;
    if (scored + conceded > 2.5) over25 += 1;
    if (scored + conceded < 3.5) under35 += 1;
    if (scored > 0 && conceded > 0) btts += 1;
    if (conceded === 0) cleanSheets += 1;
  }

  const percentage = (count: number) => Math.round((count / filtered.length) * 100);
  return {
    matches: filtered.length,
    form: form.slice(0, 5),
    goalsFor,
    goalsAgainst,
    averageGoalsFor: Number((goalsFor / filtered.length).toFixed(2)),
    averageGoalsAgainst: Number((goalsAgainst / filtered.length).toFixed(2)),
    over15: percentage(over15),
    over25: percentage(over25),
    under35: percentage(under35),
    btts: { yes: percentage(btts), no: 100 - percentage(btts) },
    cleanSheets: percentage(cleanSheets),
  };
}

function probability(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function poisson(lambda: number, goals: number) {
  let factorial = 1;
  for (let index = 2; index <= goals; index += 1) factorial *= index;
  return Math.exp(-lambda) * (lambda ** goals) / factorial;
}

function calculateModel(home: TeamStats, away: TeamStats, homeVenue: TeamStats, awayVenue: TeamStats) {
  const hasEnoughData = home.matches >= 3 && away.matches >= 3;
  if (!hasEnoughData) return null;
  const homeAttack = homeVenue.averageGoalsFor ?? home.averageGoalsFor;
  const homeDefense = homeVenue.averageGoalsAgainst ?? home.averageGoalsAgainst;
  const awayAttack = awayVenue.averageGoalsFor ?? away.averageGoalsFor;
  const awayDefense = awayVenue.averageGoalsAgainst ?? away.averageGoalsAgainst;
  if (homeAttack == null || homeDefense == null || awayAttack == null || awayDefense == null) return null;

  const homeExpected = Math.max(0.2, Math.min(4, (homeAttack + awayDefense) / 2));
  const awayExpected = Math.max(0.2, Math.min(4, (awayAttack + homeDefense) / 2));
  const outcomes = { home: 0, draw: 0, away: 0 };
  const totals = { over15: 0, over25: 0, under35: 0, btts: 0 };
  const scores: Array<{ score: string; probability: number }> = [];

  for (let homeGoals = 0; homeGoals <= 6; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 6; awayGoals += 1) {
      const p = poisson(homeExpected, homeGoals) * poisson(awayExpected, awayGoals);
      if (homeGoals > awayGoals) outcomes.home += p;
      else if (homeGoals === awayGoals) outcomes.draw += p;
      else outcomes.away += p;
      if (homeGoals + awayGoals > 1.5) totals.over15 += p;
      if (homeGoals + awayGoals > 2.5) totals.over25 += p;
      if (homeGoals + awayGoals < 3.5) totals.under35 += p;
      if (homeGoals > 0 && awayGoals > 0) totals.btts += p;
      scores.push({ score: `${homeGoals}–${awayGoals}`, probability: Number((p * 100).toFixed(1)) });
    }
  }

  const oneXtwo = { home: probability(outcomes.home), draw: probability(outcomes.draw), away: probability(outcomes.away) };
  const bttsYes = probability(totals.btts);
  const markets: PredictionMarket[] = [
    { label: "Home win", probability: oneXtwo.home, market: "1" },
    { label: "Draw", probability: oneXtwo.draw, market: "X" },
    { label: "Away win", probability: oneXtwo.away, market: "2" },
    { label: "Home or draw (1X)", probability: oneXtwo.home + oneXtwo.draw, market: "1X" },
    { label: "Draw or away (X2)", probability: oneXtwo.draw + oneXtwo.away, market: "X2" },
    { label: "Over 1.5 goals", probability: probability(totals.over15), market: "O1.5" },
    { label: "Over 2.5 goals", probability: probability(totals.over25), market: "O2.5" },
    { label: "Under 3.5 goals", probability: probability(totals.under35), market: "U3.5" },
    { label: "BTTS Yes", probability: bttsYes, market: "BTTS Y" },
    { label: "BTTS No", probability: 100 - bttsYes, market: "BTTS N" },
  ].sort((a, b) => b.probability - a.probability);

  return {
    expectedGoals: { home: Number(homeExpected.toFixed(2)), away: Number(awayExpected.toFixed(2)) },
    oneXtwo,
    doubleChance: {
      homeOrDraw: oneXtwo.home + oneXtwo.draw,
      drawOrAway: oneXtwo.draw + oneXtwo.away,
      homeOrAway: oneXtwo.home + oneXtwo.away,
    },
    overUnder: {
      over15: probability(totals.over15),
      over25: probability(totals.over25),
      under35: probability(totals.under35),
    },
    btts: { yes: bttsYes, no: 100 - bttsYes },
    scores: scores.sort((a, b) => b.probability - a.probability).slice(0, 4),
    primaryPrediction: markets[0],
    secondaryMarkets: markets.slice(1, 4),
    confidence: Math.round(Math.min(92, 50 + (Math.min(home.matches, away.matches) / 10) * 30)),
  };
}

async function fetchTeamMatches(teamId: number) {
  const today = new Date();
  const query = new URLSearchParams({
    dateFrom: dateOffset(today, -120),
    dateTo: dateInDouala(today),
    status: "FINISHED",
    limit: "20",
  });
  const payload = await fetchApi<RawMatchesResponse>(`/teams/${teamId}/matches?${query.toString()}`);
  return toCompletedMatches(payload);
}

async function fetchStandings(competitionCode: string, homeId: number, awayId: number) {
  try {
    const payload = await fetchApi<RawStandingsResponse>(`/competitions/${competitionCode}/standings?standingType=TOTAL`);
    const table = payload.standings?.find((standing) => standing.type === "TOTAL")?.table ?? payload.standings?.[0]?.table ?? [];
    const toStanding = (teamId: number): Standing | null => {
      const item = table.find((entry) => entry.team?.id === teamId);
      if (!item || item.position == null || item.points == null || item.playedGames == null || item.goalDifference == null) return null;
      return { position: item.position, points: item.points, played: item.playedGames, goalDifference: item.goalDifference };
    };
    return { home: toStanding(homeId), away: toStanding(awayId) };
  } catch {
    return { home: null, away: null };
  }
}

async function fetchHeadToHead(matchId: string) {
  try {
    const payload = await fetchApi<RawMatchesResponse>(`/matches/${matchId}/head2head?limit=10`);
    return (payload.matches ?? []).map((match): H2HMatch | null => {
      const homeGoals = match.score?.fullTime?.home;
      const awayGoals = match.score?.fullTime?.away;
      if (!match.utcDate || !match.homeTeam?.name || !match.awayTeam?.name || typeof homeGoals !== "number" || typeof awayGoals !== "number") return null;
      return { dateTime: match.utcDate, home: match.homeTeam.name, away: match.awayTeam.name, score: `${homeGoals}–${awayGoals}` };
    }).filter((item): item is H2HMatch => item !== null);
  } catch {
    return [];
  }
}

export async function listFootballFixtures(query: string, league: League): Promise<FootballResponse> {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    const unavailable = status("unavailable");
    return { ...unavailable, lastUpdated: null, fixtures: [], error: "FOOTBALL_DATA_API_KEY is not configured." };
  }

  try {
    const result = await loadFixtures();
    const terms = normalizeSearch(query).split(" ").filter(Boolean);
    const fixtures = result.fixtures.filter((fixture) => {
      const matchesLeague = league === "All" || fixture.league === league;
      const searchable = normalizeSearch(`${fixture.home} ${fixture.away} ${fixture.league}`);
      return matchesLeague && (terms.length === 0 || terms.every((term) => searchable.includes(term)));
    });
    const providerStatus = status(result.source);
    return { ...providerStatus, lastUpdated: result.lastUpdated, fixtures };
  } catch (error) {
    const unavailable = status("unavailable");
    return { ...unavailable, lastUpdated: null, fixtures: [], error: error instanceof Error ? error.message : "Unknown football provider error." };
  }
}

export async function getFootballFixtureAnalysis(fixtureId: string) {
  const listed = await listFootballFixtures("", "All");
  const fixture = listed.fixtures.find((item) => item.id === fixtureId);
  if (!fixture) return { ...listed, fixture: null };

  try {
    const [homeMatches, awayMatches, standings, headToHead] = await Promise.all([
      fetchTeamMatches(fixture.homeTeamId),
      fetchTeamMatches(fixture.awayTeamId),
      fetchStandings(fixture.competitionCode, fixture.homeTeamId, fixture.awayTeamId),
      fetchHeadToHead(fixture.id),
    ]);
    const homeStats = buildTeamStats(fixture.homeTeamId, homeMatches);
    const awayStats = buildTeamStats(fixture.awayTeamId, awayMatches);
    const homeVenueStats = buildTeamStats(fixture.homeTeamId, homeMatches, "home");
    const awayVenueStats = buildTeamStats(fixture.awayTeamId, awayMatches, "away");
    const model = calculateModel(homeStats, awayStats, homeVenueStats, awayVenueStats);
    const unavailable = [
      ...(model ? [] : ["Probabilities need at least three completed matches for each team."]),
      "Injuries and suspensions are not provided by football-data.org.",
      "Expected goals are model estimates from recent goal averages; provider xG is unavailable.",
      ...(standings.home && standings.away ? [] : ["League position is unavailable for this competition."]),
      ...(headToHead.length ? [] : ["Head-to-head history is unavailable for this fixture."]),
    ];
    const analysis: MatchAnalysis = {
      homeStats,
      awayStats,
      homeVenueStats,
      awayVenueStats,
      oneXtwo: model?.oneXtwo ?? { home: null, draw: null, away: null },
      doubleChance: model?.doubleChance ?? { homeOrDraw: null, drawOrAway: null, homeOrAway: null },
      overUnder: model?.overUnder ?? { over15: null, over25: null, under35: null },
      btts: model?.btts ?? { yes: null, no: null },
      scores: model?.scores ?? [],
      expectedGoals: model?.expectedGoals ?? { home: null, away: null },
      standings,
      headToHead,
      injuries: { available: false, reason: "football-data.org does not expose injury or suspension feeds." },
      primaryPrediction: model?.primaryPrediction ?? null,
      secondaryMarkets: model?.secondaryMarkets ?? [],
      confidence: model?.confidence ?? null,
      insight: model
        ? `Model calculations use ${homeStats.matches} recent ${fixture.home} matches and ${awayStats.matches} recent ${fixture.away} matches.`
        : "The provider returned fixture data, but not enough verified recent results to calculate probabilities.",
      unavailable,
    };
    return { ...listed, fixture: { ...fixture, analysis } };
  } catch (error) {
    logger.warn({ err: error, fixtureId }, "Football match analysis unavailable");
    return { ...listed, fixture: { ...fixture, analysis: null }, error: "Fixture details are available, but match analysis could not be loaded." };
  }
}

export function clearFootballCache() {
  fixturesCache = null;
  responseCache.clear();
}