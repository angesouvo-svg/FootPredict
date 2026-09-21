import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  CircleDot,
  Clock3,
  Filter,
  Minus,
  Pin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter } from 'wouter';
import {
  createFootballDataProvider,
  formatFixtureDate,
  formatHeroDate,
  formatKickoff,
  formatModelUpdated,
  formatRelativeKickoff,
  type Fixture,
  type League,
  type MatchAnalysis,
  type Probability,
  type ProviderStatus,
  type Result,
  type TeamStats,
} from '@/data/football-provider';

type Tab = 'overview' | 'analysis';
const queryClient = new QueryClient();

function FormDots({ results }: { results: Result[] }) {
  if (!results.length) return <span className="unavailable-inline">Unavailable</span>;
  return (
    <div className="form-dots" aria-label={`Recent form: ${results.join(', ')}`}>
      {results.map((result, index) => (
        <span className={`form-dot ${result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss'}`} key={`${result}-${index}`}>
          {result}
        </span>
      ))}
    </div>
  );
}

function FixtureItem({ fixture, selected, onSelect }: { fixture: Fixture; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`fixture-item ${selected ? 'selected' : ''}`} onClick={onSelect} data-testid={`button-fixture-${fixture.id}`}>
      <div className="fixture-meta">
        <span>{fixture.league} · {formatFixtureDate(fixture.dateTime)}</span>
        <span className="fixture-status">{formatKickoff(fixture.dateTime)}</span>
      </div>
      <div className="fixture-teams">
        <div className="fixture-team"><span className="mini-crest">{fixture.homeCode.slice(0, 2)}</span>{fixture.home}</div>
        <div className="fixture-team"><span className="mini-crest">{fixture.awayCode.slice(0, 2)}</span>{fixture.away}</div>
      </div>
    </button>
  );
}

function displayProbability(value: Probability) {
  return value == null ? '—' : `${value}%`;
}

function ProbabilityRows({ rows }: { rows: Array<{ name: string; value: Probability; tone?: string }> }) {
  return (
    <div>
      {rows.map((row) => (
        <div className="probability-row" key={row.name}>
          <span className="probability-name">{row.name}</span>
          <div className="probability-track" aria-label={`${row.name} ${row.value == null ? 'unavailable' : `${row.value}%`}`}>
            <div className={`probability-fill ${row.tone ?? ''} ${row.value == null ? 'unavailable' : ''}`} style={{ width: `${row.value ?? 0}%` }} />
          </div>
          <span className={`probability-number ${row.value == null ? 'unavailable-inline' : ''}`}>{displayProbability(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DataUnavailable({ children }: { children: React.ReactNode }) {
  return <div className="data-unavailable"><strong>Unavailable</strong><span>{children}</span></div>;
}

function MatchHero({ fixture, pinned, dataStatus, onPin, onAnalysis }: { fixture: Fixture; pinned: boolean; dataStatus: ProviderStatus; onPin: () => void; onAnalysis: () => void }) {
  const analysis = fixture.analysis;
  return (
    <section className="match-card" data-testid={`card-selected-match-${fixture.id}`}>
      <div className="match-card-head">
        <span>{fixture.league} <span aria-hidden="true">·</span> {formatFixtureDate(fixture.dateTime)}</span>
        <div className="match-card-tools">
          <span className="live-label"><span className={`status-dot ${dataStatus.source === 'unavailable' ? 'demo' : ''}`} /> {dataStatus.label}</span>
          <button className={`icon-button ${pinned ? 'active' : ''}`} onClick={onPin} aria-label={pinned ? 'Unpin match' : 'Pin match'} data-testid="button-pin-match">
            <Pin size={14} />
          </button>
        </div>
      </div>
      <div className="match-teams">
        <div className="team-block">
          <div className="team-crest">{fixture.homeCode}</div>
          <div className="team-name">{fixture.home}</div>
          <div className="team-formline">home · {displayProbability(analysis?.expectedGoals?.home ?? null)} xG</div>
        </div>
        <div className="versus">
          <span>{formatKickoff(fixture.dateTime)}</span>
          <strong>vs</strong>
          <span>{formatRelativeKickoff(fixture.dateTime)}</span>
        </div>
        <div className="team-block">
          <div className="team-crest">{fixture.awayCode}</div>
          <div className="team-name">{fixture.away}</div>
          <div className="team-formline">away · {displayProbability(analysis?.expectedGoals?.away ?? null)} xG</div>
        </div>
      </div>
      <div className="match-action-row">
        <button className="primary-button" onClick={onAnalysis} data-testid="button-open-analysis">
          Open full analysis <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}

function Overview({ fixture, onAnalysis }: { fixture: Fixture; onAnalysis: () => void }) {
  const analysis = fixture.analysis;
  if (!analysis) {
    return <div className="empty-state"><Clock3 size={24} /><div><h2>Loading match analysis</h2><p>Reading recent form, standings, and available provider data for this fixture.</p></div></div>;
  }

  return (
    <>
      <div className="insight-callout" data-testid="text-match-insight">
        <Sparkles size={16} />
        <p><strong>Model read.</strong> {analysis.insight}</p>
      </div>
      <div className="metric-grid">
        <div className="metric-card"><div className="metric-label"><span>Home win</span><Target size={14} /></div><span className="metric-value">{displayProbability(analysis.oneXtwo.home)}</span></div>
        <div className="metric-card"><div className="metric-label"><span>Draw</span><Minus size={14} /></div><span className="metric-value">{displayProbability(analysis.oneXtwo.draw)}</span></div>
        <div className="metric-card"><div className="metric-label"><span>Away win</span><TrendingUp size={14} /></div><span className="metric-value">{displayProbability(analysis.oneXtwo.away)}</span></div>
      </div>
      <div className="probability-card" data-testid="card-1x2-probabilities">
        <div className="card-heading"><div><h2>1X2 probabilities</h2><p>Estimated from verified recent results</p></div><span className="tiny-label">model calculation</span></div>
        <ProbabilityRows rows={[{ name: fixture.home, value: analysis.oneXtwo.home }, { name: 'Draw', value: analysis.oneXtwo.draw, tone: 'muted' }, { name: fixture.away, value: analysis.oneXtwo.away, tone: 'teal' }]} />
      </div>
      <div className="two-column">
        <div className="data-card">
          <div className="card-heading"><div><h3>Goal markets</h3><p>Estimated from recent goal totals</p></div><BarChart3 size={16} color="hsl(var(--primary))" /></div>
          <ProbabilityRows rows={[{ name: 'Over 1.5', value: analysis.overUnder.over15 }, { name: 'Over 2.5', value: analysis.overUnder.over25, tone: 'teal' }, { name: 'Under 3.5', value: analysis.overUnder.under35, tone: 'muted' }]} />
        </div>
        <div className="data-card">
          <div className="card-heading"><div><h3>Both to score</h3><p>BTTS model split</p></div><CircleDot size={16} color="hsl(var(--chart-2))" /></div>
          <ProbabilityRows rows={[{ name: 'Yes', value: analysis.btts.yes, tone: 'teal' }, { name: 'No', value: analysis.btts.no, tone: 'muted' }]} />
          <button className="subtle-button" onClick={onAnalysis} data-testid="button-view-scorelines">See full analysis <ChevronRight size={13} /></button>
        </div>
      </div>
    </>
  );
}

function TeamStatsCard({ title, subtitle, stats, team }: { title: string; subtitle: string; stats: TeamStats; team: string }) {
  return (
    <div className="data-card" data-testid={`card-stats-${team.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="card-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><Activity size={16} color="hsl(var(--chart-2))" /></div>
      {stats.matches ? (
        <div className="stat-list">
          <div><span>Matches sampled</span><strong>{stats.matches}</strong></div>
          <div><span>Goals scored</span><strong>{stats.goalsFor ?? '—'} <small>{stats.averageGoalsFor == null ? '' : `(${stats.averageGoalsFor}/match)`}</small></strong></div>
          <div><span>Goals conceded</span><strong>{stats.goalsAgainst ?? '—'} <small>{stats.averageGoalsAgainst == null ? '' : `(${stats.averageGoalsAgainst}/match)`}</small></strong></div>
          <div><span>Clean sheets</span><strong>{displayProbability(stats.cleanSheets)}</strong></div>
          <div><span>Over 1.5 / Over 2.5</span><strong>{displayProbability(stats.over15)} / {displayProbability(stats.over25)}</strong></div>
          <div><span>Under 3.5 / BTTS</span><strong>{displayProbability(stats.under35)} / {displayProbability(stats.btts.yes)}</strong></div>
        </div>
      ) : <DataUnavailable>Recent completed matches were not returned for this team.</DataUnavailable>}
    </div>
  );
}

function PredictionSection({ analysis }: { analysis: MatchAnalysis }) {
  const primary = analysis.primaryPrediction;
  return (
    <section className="prediction-card" data-testid="card-prediction" aria-labelledby="prediction-heading">
      <div className="prediction-kicker"><span className="prediction-marker" /> FootPredict Prediction</div>
      {primary ? (
        <div className="prediction-layout">
          <div><p className="prediction-overline">Primary prediction</p><h2 id="prediction-heading">{primary.label}</h2><p>Selected because it has the strongest estimated probability across the available model markets. This is not guaranteed betting advice.</p></div>
          <div className="prediction-confidence"><span>Estimated probability</span><strong>{primary.probability}%</strong></div>
        </div>
      ) : (
        <div className="prediction-layout">
          <div><p className="prediction-overline">Primary prediction</p><h2 id="prediction-heading">Insufficient data</h2><p>The provider did not return enough verified results to calculate a responsible match prediction.</p></div>
          <div className="prediction-confidence unavailable"><span>Probability</span><strong>—</strong></div>
        </div>
      )}
      {analysis.secondaryMarkets.length > 0 && (
        <div className="secondary-markets">
          <span className="tiny-label">Secondary markets</span>
          <div>{analysis.secondaryMarkets.map((market) => <span key={market.market} className="market-chip">{market.label} <strong>{market.probability}%</strong></span>)}</div>
        </div>
      )}
      <p className="prediction-footnote">Real provider data → model calculations → estimated probabilities. No outcome is guaranteed.</p>
    </section>
  );
}

function Analysis({ fixture, status }: { fixture: Fixture; status: ProviderStatus }) {
  const analysis = fixture.analysis;
  if (!analysis) return <div className="empty-state"><AlertTriangle size={24} /><div><h2>Analysis unavailable</h2><p>The fixture was found, but its analysis could not be loaded.</p></div></div>;
  const confidence = analysis.confidence;
  return (
    <>
      <div className="analysis-header">
        <div><p className="eyebrow">Signal report / {fixture.homeCode}—{fixture.awayCode}</p><h2>What the model sees</h2></div>
        <p>{status.label} is separated from model calculations. Unavailable values are not estimated.</p>
      </div>
      <div className="confidence-card" data-testid="card-confidence">
        <div className="confidence-ring">{displayProbability(confidence)}</div>
        <div className="confidence-copy"><strong>Model confidence</strong><p>{confidence == null ? 'Not available without enough verified match history.' : `Based on sample size and agreement across the available signals.`}</p></div>
        <span className="confidence-tag"><ShieldCheck size={12} /> {confidence == null ? 'unavailable' : 'estimated'}</span>
      </div>
      <div className="probability-card" data-testid="card-analysis-1x2">
        <div className="card-heading"><div><h2>Match outcome</h2><p>Estimated probability, not a betting recommendation</p></div><span className="tiny-label">1X2</span></div>
        <ProbabilityRows rows={[{ name: fixture.home, value: analysis.oneXtwo.home }, { name: 'Draw', value: analysis.oneXtwo.draw, tone: 'muted' }, { name: fixture.away, value: analysis.oneXtwo.away, tone: 'teal' }]} />
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-over-under"><div className="card-heading"><div><h3>Over / under</h3><p>Estimated goal-line probabilities</p></div><Activity size={16} color="hsl(var(--primary))" /></div><ProbabilityRows rows={[{ name: 'Over 1.5', value: analysis.overUnder.over15 }, { name: 'Over 2.5', value: analysis.overUnder.over25, tone: 'teal' }, { name: 'Under 3.5', value: analysis.overUnder.under35, tone: 'muted' }]} /></div>
        <div className="data-card" data-testid="card-btts"><div className="card-heading"><div><h3>BTTS</h3><p>Both teams score</p></div><Zap size={16} color="hsl(var(--chart-3))" /></div><ProbabilityRows rows={[{ name: 'Yes', value: analysis.btts.yes, tone: 'teal' }, { name: 'No', value: analysis.btts.no, tone: 'muted' }]} /></div>
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-double-chance"><div className="card-heading"><div><h3>Double chance</h3><p>Combined 1X2 outcomes</p></div><ShieldCheck size={16} color="hsl(var(--chart-2))" /></div><ProbabilityRows rows={[{ name: 'Home or draw (1X)', value: analysis.doubleChance.homeOrDraw }, { name: 'Draw or away (X2)', value: analysis.doubleChance.drawOrAway, tone: 'teal' }, { name: 'Home or away (12)', value: analysis.doubleChance.homeOrAway, tone: 'muted' }]} /></div>
        <div className="data-card" data-testid="card-asian-handicap"><div className="card-heading"><div><h3>Asian handicap</h3><p>Verified provider lines only</p></div><AlertTriangle size={16} color="hsl(var(--primary))" /></div><DataUnavailable>football-data.org does not publish bookmaker handicap lines.</DataUnavailable></div>
      </div>
      <div className="two-column">
        <TeamStatsCard title={`${fixture.home} recent form`} subtitle="Last completed matches returned by provider" stats={analysis.homeStats} team={fixture.home} />
        <TeamStatsCard title={`${fixture.away} recent form`} subtitle="Last completed matches returned by provider" stats={analysis.awayStats} team={fixture.away} />
      </div>
      <div className="two-column">
        <TeamStatsCard title={`${fixture.home} home form`} subtitle="Home venue split" stats={analysis.homeVenueStats} team={`${fixture.home}-home`} />
        <TeamStatsCard title={`${fixture.away} away form`} subtitle="Away venue split" stats={analysis.awayVenueStats} team={`${fixture.away}-away`} />
      </div>
      <div className="data-card goals-signals-card" data-testid="card-goals-signals">
        <div className="card-heading"><div><h3>Goals and team signals</h3><p>Provider statistics and model estimates are shown separately</p></div><BarChart3 size={16} color="hsl(var(--chart-2))" /></div>
        <div className="signal-grid">
          <div><span>Expected goals / model</span><strong>{displayProbability(analysis.expectedGoals.home)} — {displayProbability(analysis.expectedGoals.away)}</strong></div>
          <div><span>Clean sheets / provider</span><strong>{displayProbability(analysis.homeStats.cleanSheets)} — {displayProbability(analysis.awayStats.cleanSheets)}</strong></div>
          <div><span>BTTS yes / model</span><strong>{displayProbability(analysis.btts.yes)}</strong></div>
        </div>
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-standings"><div className="card-heading"><div><h3>League position</h3><p>Competition table when available</p></div><TrendingUp size={16} color="hsl(var(--chart-2))" /></div>{analysis.standings.home && analysis.standings.away ? <div className="standing-list"><div><span>{fixture.home}</span><strong>#{analysis.standings.home.position} · {analysis.standings.home.points} pts</strong></div><div><span>{fixture.away}</span><strong>#{analysis.standings.away.position} · {analysis.standings.away.points} pts</strong></div></div> : <DataUnavailable>League position is unavailable for this competition.</DataUnavailable>}</div>
        <div className="data-card" data-testid="card-injuries"><div className="card-heading"><div><h3>Injuries / suspensions</h3><p>Availability information</p></div><AlertTriangle size={16} color="hsl(var(--primary))" /></div><DataUnavailable>{analysis.injuries.reason}</DataUnavailable></div>
      </div>
      <div className="data-card" data-testid="card-head-to-head"><div className="card-heading"><div><h3>Head-to-head</h3><p>Previous meetings when returned by provider</p></div><CircleDot size={16} color="hsl(var(--chart-2))" /></div>{analysis.headToHead.length ? <div className="h2h-list">{analysis.headToHead.slice(0, 5).map((match) => <div key={`${match.dateTime}-${match.score}`}><span>{formatFixtureDate(match.dateTime)}</span><strong>{match.home} {match.score} {match.away}</strong></div>)}</div> : <DataUnavailable>No head-to-head history was returned.</DataUnavailable>}</div>
      <div className="data-card" data-testid="card-probable-scores"><div className="card-heading"><div><h3>Probable scores</h3><p>Secondary exact-score estimates from the model</p></div><Target size={16} color="hsl(var(--primary))" /></div>{analysis.scores.length ? <div className="score-grid">{analysis.scores.map((score) => <div className="score-pill" key={score.score}><strong>{score.score}</strong><span>{score.probability}%</span></div>)}</div> : <DataUnavailable>Exact-score estimates are unavailable without enough match history.</DataUnavailable>}</div>
      <PredictionSection analysis={analysis} />
      {analysis.unavailable.length > 0 && <div className="transparency-note"><strong>Unavailable inputs</strong><span>{analysis.unavailable.join(' ')}</span></div>}
    </>
  );
}

function Home() {
  const dataProvider = useMemo(() => createFootballDataProvider(), []);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(dataProvider.status);
  const [query, setQuery] = useState('');
  const [league, setLeague] = useState<League>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [pinned, setPinned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingData(true);
    setDataError(null);
    dataProvider.searchFixtures({ query, league }).then((response) => {
      if (cancelled) return;
      setProviderStatus(response.status);
      setLastUpdated(response.lastUpdated ? formatModelUpdated(new Date(response.lastUpdated)) : null);
      setFilteredFixtures(response.fixtures);
      setSelectedFixture(null);
      setSelectedId(response.fixtures[0]?.id ?? null);
      setIsLoadingData(false);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setFilteredFixtures([]);
      setSelectedFixture(null);
      setSelectedId(null);
      setDataError(error instanceof Error ? error.message : 'The football data provider could not be reached.');
      setProviderStatus({ source: 'unavailable', label: 'DATA SOURCE UNAVAILABLE', description: 'The live football provider could not be reached.', reliableForPredictions: false });
      setIsLoadingData(false);
    });
    return () => { cancelled = true; };
  }, [dataProvider, league, query]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setIsLoadingAnalysis(true);
    dataProvider.getFixtureAnalysis(selectedId).then((response) => {
      if (cancelled) return;
      setProviderStatus(response.status);
      if (response.fixture) setSelectedFixture(response.fixture);
      setIsLoadingAnalysis(false);
    }).catch(() => {
      if (cancelled) return;
      setIsLoadingAnalysis(false);
      setDataError('The fixture was found, but its detailed analysis could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [dataProvider, selectedId]);

  function selectFixture(fixture: Fixture) {
    setSelectedId(fixture.id);
    setSelectedFixture(null);
    setDataError(null);
    setTab('overview');
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setSelectedId(null);
    setSelectedFixture(null);
    setPinned(false);
    setTab('overview');
  }

  function handleLeagueChange(value: League) {
    setLeague(value);
    setSelectedId(null);
    setSelectedFixture(null);
    setPinned(false);
    setTab('overview');
  }

  async function refreshModel() {
    setRefreshing(true);
    setDataError(null);
    try {
      await dataProvider.refresh();
      const response = await dataProvider.searchFixtures({ query, league });
      setProviderStatus(response.status);
      setLastUpdated(response.lastUpdated ? formatModelUpdated(new Date(response.lastUpdated)) : formatModelUpdated(new Date()));
      setFilteredFixtures(response.fixtures);
      setSelectedFixture(null);
      setSelectedId(response.fixtures[0]?.id ?? null);
    } catch {
      setDataError('The football data provider could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  }

  const activeFixture = selectedFixture ?? filteredFixtures.find((fixture) => fixture.id === selectedId) ?? null;

  return (
    <div className="app-shell app-noise">
      <header className="topbar"><div className="topbar-inner"><Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark">FP</span><span className="brand-name">Foot<span>Predict</span></span></Link><nav className="top-nav" aria-label="Primary navigation"><a href="#fixtures" aria-current="page" data-testid="link-fixtures">Fixtures</a><a href="#analysis" data-testid="link-analysis">Analysis</a></nav><div className="status-chip"><span className={`status-dot ${providerStatus.source === 'unavailable' ? 'demo' : ''}`} /> {providerStatus.label}</div></div></header>
      <main className="page-wrap">
        <section className="hero"><div><p className="eyebrow">{formatHeroDate(new Date())} / matchday desk</p><h1>Read the game<br /><em>before it starts.</em></h1><p className="hero-copy">Search the current football schedule, inspect verified team data, and see exactly which model inputs are available.</p></div><div className="model-note"><div className="model-note-label"><span>Data source</span><span>{providerStatus.label}</span></div><strong>{lastUpdated ? `Last updated ${lastUpdated}` : 'Waiting for provider data'}</strong><p className="data-status-note">{providerStatus.description}</p><div className={`model-line ${refreshing ? 'refreshing' : ''}`} /></div></section>
        <section id="fixtures" aria-labelledby="search-heading"><p className="section-label" id="search-heading">Find a fixture</p><div className="search-panel"><div className="search-row"><div className="search-input-wrap"><Search className="search-icon" /><input className="search-input" type="search" value={query} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search Leeds United, Chelsea, Arsenal, or a fixture…" aria-label="Search fixtures" data-testid="input-fixture-search" />{query && <button className="clear-search" onClick={() => handleSearchChange('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}</div><button className={`filter-button ${league !== 'All' ? 'active' : ''}`} onClick={() => handleLeagueChange(league === 'All' ? 'Premier League' : 'All')} data-testid="button-filter-league"><Filter size={14} /> {league === 'All' ? 'All leagues' : league}</button></div><div className="league-filters" aria-label="League filters">{(['All', 'Premier League', 'La Liga', 'Champions League'] as League[]).map((item) => <button className={`league-filter ${league === item ? 'active' : ''}`} key={item} onClick={() => handleLeagueChange(item)} data-testid={`button-league-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div></div></section>
        <div className="workspace">
          <aside className="fixture-sidebar" aria-label="Fixture list"><div className="section-label"><span>Current fixtures</span><span className="fixture-count">{isLoadingData ? 'updating' : `${filteredFixtures.length} matches`}</span></div>{isLoadingData ? <div className="sidebar-empty"><strong>Loading live fixture data</strong>Checking football-data.org through the secure API proxy.</div> : filteredFixtures.length > 0 ? <div className="fixture-list">{filteredFixtures.map((fixture) => <FixtureItem fixture={fixture} selected={fixture.id === selectedId} onSelect={() => selectFixture(fixture)} key={fixture.id} />)}</div> : <div className="sidebar-empty" data-testid="empty-fixture-list"><strong>{providerStatus.source === 'unavailable' ? 'DATA SOURCE UNAVAILABLE' : 'No current fixture data'}</strong><span>{dataError ?? (query ? `The provider returned no current fixture for “${query}”.` : 'No upcoming fixture was returned for this league filter.')}</span></div>}</aside>
          <section className="detail-panel" id="analysis" aria-label="Selected fixture analysis">
            <div className="detail-tabs" role="tablist" aria-label="Fixture detail views"><button className={`detail-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} role="tab" aria-selected={tab === 'overview'} data-testid="tab-overview">Overview</button><button className={`detail-tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')} role="tab" aria-selected={tab === 'analysis'} data-testid="tab-analysis">Full analysis</button><button className="detail-tab" onClick={refreshModel} role="button" data-testid="button-refresh-model"><RefreshCw size={13} className={refreshing ? 'refreshing' : ''} /> Refresh</button></div>
            {isLoadingData ? <div className="empty-state" data-testid="loading-analysis"><Clock3 size={24} /><div><h2>Loading current fixtures</h2><p>Reading the configured football data provider.</p></div></div> : dataError && !activeFixture ? <div className="empty-state" data-testid="data-error"><AlertTriangle size={24} /><div><h2>Data source unavailable</h2><p>{dataError}</p></div><button className="subtle-button" onClick={refreshModel} data-testid="button-retry-data">Try again</button></div> : !activeFixture ? <div className="empty-state" data-testid="empty-analysis"><Search size={24} /><div><h2>{providerStatus.source === 'unavailable' ? 'DATA SOURCE UNAVAILABLE' : 'No current fixture data'}</h2><p>{query ? `No verified current fixture data is available for “${query}”.` : 'Search for any team or fixture returned by the connected football provider.'}</p></div><button className="subtle-button" onClick={() => { handleSearchChange(''); handleLeagueChange('All'); }} data-testid="button-reset-search">Reset fixture search</button></div> : isLoadingAnalysis || !activeFixture.analysis ? <><MatchHero fixture={activeFixture} pinned={pinned} dataStatus={providerStatus} onPin={() => setPinned(!pinned)} onAnalysis={() => setTab('analysis')} /><div className="empty-state compact-empty"><Clock3 size={22} /><div><h2>Loading verified match analysis</h2><p>Fetching recent form, standings, head-to-head, and available team statistics.</p></div></div></> : <><MatchHero fixture={activeFixture} pinned={pinned} dataStatus={providerStatus} onPin={() => setPinned(!pinned)} onAnalysis={() => setTab('analysis')} />{tab === 'overview' ? <Overview fixture={activeFixture} onAnalysis={() => setTab('analysis')} /> : <Analysis fixture={activeFixture} status={providerStatus} />}</>}
          </section>
        </div>
      </main>
      <footer className="footer"><div className="topbar-inner" style={{ width: '100%' }}><span>FootPredict / matchday intelligence</span><span>Numbers explain the game. They do not decide it.</span></div></footer>
    </div>
  );
}

function Router() {
  return <ErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;