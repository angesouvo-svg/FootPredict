import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
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
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  createFootballDataProvider,
  formatFixtureDate,
  formatHeroDate,
  formatKickoff,
  formatModelUpdated,
  formatRelativeKickoff,
  type Fixture,
  type League,
  type ProviderStatus,
  type Result,
} from '@/data/football-provider';

type Tab = 'overview' | 'analysis';

const queryClient = new QueryClient();

function FormDots({ results }: { results: Result[] }) {
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

function ProbabilityRows({ rows }: { rows: Array<{ name: string; value: number; tone?: string }> }) {
  return (
    <div>
      {rows.map((row) => (
        <div className="probability-row" key={row.name}>
          <span className="probability-name">{row.name}</span>
          <div className="probability-track" aria-label={`${row.name} ${row.value}%`}>
            <div className={`probability-fill ${row.tone ?? ''}`} style={{ width: `${row.value}%` }} />
          </div>
          <span className="probability-number">{row.value}%</span>
        </div>
      ))}
    </div>
  );
}

function MatchHero({ fixture, pinned, dataStatus, onPin, onAnalysis }: { fixture: Fixture; pinned: boolean; dataStatus: ProviderStatus; onPin: () => void; onAnalysis: () => void }) {
  return (
    <section className="match-card" data-testid={`card-selected-match-${fixture.id}`}>
      <div className="match-card-head">
        <span>{fixture.league} <span aria-hidden="true">·</span> {formatFixtureDate(fixture.dateTime)}</span>
        <div className="match-card-tools">
          <span className="live-label"><span className={`status-dot ${dataStatus.source === 'demo' ? 'demo' : ''}`} /> {dataStatus.label}</span>
          <button className={`icon-button ${pinned ? 'active' : ''}`} onClick={onPin} aria-label={pinned ? 'Unpin match' : 'Pin match'} data-testid="button-pin-match">
            <Pin size={14} />
          </button>
        </div>
      </div>
      <div className="match-teams">
        <div className="team-block">
          <div className="team-crest">{fixture.homeCode}</div>
          <div className="team-name">{fixture.home}</div>
          <div className="team-formline">home · {fixture.homeGoals} xG</div>
        </div>
        <div className="versus">
          <span>{formatKickoff(fixture.dateTime)}</span>
          <strong>vs</strong>
          <span>{formatRelativeKickoff(fixture.dateTime)}</span>
        </div>
        <div className="team-block">
          <div className="team-crest">{fixture.awayCode}</div>
          <div className="team-name">{fixture.away}</div>
          <div className="team-formline">away · {fixture.awayGoals} xG</div>
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
  return (
    <>
      <div className="insight-callout" data-testid="text-match-insight">
        <Sparkles size={16} />
        <p><strong>Model read.</strong> {fixture.insight}</p>
      </div>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label"><span>Home win</span><Target size={14} /></div>
          <span className="metric-value">{fixture.oneXtwo.home}<small>%</small></span>
        </div>
        <div className="metric-card">
          <div className="metric-label"><span>Draw</span><Minus size={14} /></div>
          <span className="metric-value">{fixture.oneXtwo.draw}<small>%</small></span>
        </div>
        <div className="metric-card">
          <div className="metric-label"><span>Away win</span><TrendingUp size={14} /></div>
          <span className="metric-value">{fixture.oneXtwo.away}<small>%</small></span>
        </div>
      </div>
      <div className="probability-card" data-testid="card-1x2-probabilities">
        <div className="card-heading">
          <div><h2>1X2 probabilities</h2><p>Model outcome distribution</p></div>
          <span className="tiny-label">pre-match</span>
        </div>
        <ProbabilityRows rows={[
          { name: fixture.home, value: fixture.oneXtwo.home },
          { name: 'Draw', value: fixture.oneXtwo.draw, tone: 'muted' },
          { name: fixture.away, value: fixture.oneXtwo.away, tone: 'teal' },
        ]} />
      </div>
      <div className="two-column">
        <div className="data-card">
          <div className="card-heading">
            <div><h3>Goal markets</h3><p>Expected match tempo</p></div>
            <BarChart3 size={16} color="hsl(var(--primary))" />
          </div>
          <ProbabilityRows rows={[
            { name: 'Over 1.5', value: fixture.overUnder.over15 },
            { name: 'Over 2.5', value: fixture.overUnder.over25, tone: 'teal' },
            { name: 'Under 3.5', value: fixture.overUnder.under35, tone: 'muted' },
          ]} />
        </div>
        <div className="data-card">
          <div className="card-heading">
            <div><h3>Both to score</h3><p>BTTS likelihood</p></div>
            <CircleDot size={16} color="hsl(var(--chart-2))" />
          </div>
          <ProbabilityRows rows={[
            { name: 'Yes', value: fixture.btts.yes, tone: 'teal' },
            { name: 'No', value: fixture.btts.no, tone: 'muted' },
          ]} />
          <button className="subtle-button" onClick={onAnalysis} data-testid="button-view-scorelines">
            See scorelines <ArrowIcon />
          </button>
        </div>
      </div>
    </>
  );
}

function ArrowIcon() {
  return <ChevronRight size={13} />;
}

type PredictionSignal = {
  label: string;
  confidence: number;
  reason: string;
};

function getStrongestPrediction(fixture: Fixture): PredictionSignal {
  const candidates: PredictionSignal[] = [
    {
      label: `${fixture.home} to win`,
      confidence: fixture.oneXtwo.home,
      reason: `${fixture.home} has the highest single-match outcome probability.`,
    },
    {
      label: 'Draw',
      confidence: fixture.oneXtwo.draw,
      reason: 'The draw is the strongest single outcome in the 1X2 distribution.',
    },
    {
      label: `${fixture.away} to win`,
      confidence: fixture.oneXtwo.away,
      reason: `${fixture.away} has the highest single-match outcome probability.`,
    },
    {
      label: 'Over 1.5 goals',
      confidence: fixture.overUnder.over15,
      reason: 'The goal model gives the Over 1.5 line its strongest goal-market probability.',
    },
    {
      label: 'Over 2.5 goals',
      confidence: fixture.overUnder.over25,
      reason: 'The goal model gives the Over 2.5 line its strongest goal-market probability.',
    },
    {
      label: 'Under 3.5 goals',
      confidence: fixture.overUnder.under35,
      reason: 'The model expects the match to stay below the 3.5 goal line most often.',
    },
    {
      label: 'BTTS: Yes',
      confidence: fixture.btts.yes,
      reason: 'Both teams scoring has the stronger side of the BTTS split.',
    },
    {
      label: 'BTTS: No',
      confidence: fixture.btts.no,
      reason: 'The no side has the stronger probability in the BTTS split.',
    },
  ];

  return candidates.reduce((strongest, candidate) => candidate.confidence > strongest.confidence ? candidate : strongest);
}

function PredictionSection({ fixture, status }: { fixture: Fixture; status: ProviderStatus }) {
  const strongestPrediction = getStrongestPrediction(fixture);
  const hasReliableData = status.reliableForPredictions;

  return (
    <section className="prediction-card" data-testid="card-prediction" aria-labelledby="prediction-heading">
      <div className="prediction-kicker"><span className="prediction-marker" /> Prediction</div>
      {hasReliableData ? (
        <div className="prediction-layout">
          <div>
            <h2 id="prediction-heading">{strongestPrediction.label}</h2>
            <p>{strongestPrediction.reason}</p>
          </div>
          <div className="prediction-confidence">
            <span>Confidence</span>
            <strong>{strongestPrediction.confidence}%</strong>
          </div>
        </div>
      ) : (
        <div className="prediction-layout">
          <div>
            <h2 id="prediction-heading">Insufficient data</h2>
            <p>The current provider is marked {status.label}. A live or verified cached data source is required before FootPredict can issue a statistical prediction.</p>
          </div>
          <div className="prediction-confidence unavailable">
            <span>Confidence</span>
            <strong>—</strong>
          </div>
        </div>
      )}
      <p className="prediction-footnote">Predictions are only published when the provider reports reliable statistical inputs.</p>
    </section>
  );
}

function Analysis({ fixture, status }: { fixture: Fixture; status: ProviderStatus }) {
  return (
    <>
      <div className="analysis-header">
        <div><p className="eyebrow">Signal report / {fixture.homeCode}—{fixture.awayCode}</p><h2>What the model sees</h2></div>
        <p>Probability is not certainty. This is the cleanest read from form, strength and chance quality.</p>
      </div>
      <div className="confidence-card" data-testid="card-confidence">
        <div className="confidence-ring">{fixture.confidence}%</div>
        <div className="confidence-copy">
          <strong>Model confidence</strong>
          <p>Agreement across the underlying signals is {fixture.confidence >= 75 ? 'strong' : 'moderate'} for this fixture.</p>
        </div>
        <span className="confidence-tag"><ShieldCheck size={12} /> {fixture.confidence >= 75 ? 'high signal' : 'mixed signal'}</span>
      </div>
      <div className="probability-card" data-testid="card-analysis-1x2">
        <div className="card-heading">
          <div><h2>Match outcome</h2><p>Estimated probability, not a betting recommendation</p></div>
          <span className="tiny-label">1X2</span>
        </div>
        <ProbabilityRows rows={[
          { name: fixture.home, value: fixture.oneXtwo.home },
          { name: 'Draw', value: fixture.oneXtwo.draw, tone: 'muted' },
          { name: fixture.away, value: fixture.oneXtwo.away, tone: 'teal' },
        ]} />
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-over-under">
          <div className="card-heading"><div><h3>Over / under</h3><p>Goal line probabilities</p></div><Activity size={16} color="hsl(var(--primary))" /></div>
          <ProbabilityRows rows={[
            { name: 'Over 1.5', value: fixture.overUnder.over15 },
            { name: 'Over 2.5', value: fixture.overUnder.over25, tone: 'teal' },
            { name: 'Under 3.5', value: fixture.overUnder.under35, tone: 'muted' },
          ]} />
        </div>
        <div className="data-card" data-testid="card-btts">
          <div className="card-heading"><div><h3>BTTS</h3><p>Both teams score</p></div><Zap size={16} color="hsl(var(--chart-3))" /></div>
          <ProbabilityRows rows={[
            { name: 'Yes', value: fixture.btts.yes, tone: 'teal' },
            { name: 'No', value: fixture.btts.no, tone: 'muted' },
          ]} />
        </div>
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-double-chance">
          <div className="card-heading"><div><h3>Double chance</h3><p>Combined 1X2 outcomes</p></div><Check size={16} color="hsl(var(--chart-2))" /></div>
          <ProbabilityRows rows={[
            { name: 'Home or draw', value: fixture.oneXtwo.home + fixture.oneXtwo.draw },
            { name: 'Draw or away', value: fixture.oneXtwo.draw + fixture.oneXtwo.away, tone: 'teal' },
            { name: 'Home or away', value: fixture.oneXtwo.home + fixture.oneXtwo.away, tone: 'muted' },
          ]} />
        </div>
        <div className="data-card" data-testid="card-asian-handicap">
          <div className="card-heading"><div><h3>Asian handicap</h3><p>Verified handicap lines only</p></div><AlertTriangle size={16} color="hsl(var(--primary))" /></div>
          <div className="data-unavailable">
            <strong>Insufficient data</strong>
            <span>Handicap lines are not available from the current {status.label.toLowerCase()} provider.</span>
          </div>
        </div>
      </div>
      <div className="two-column">
        <div className="data-card" data-testid="card-probable-scores">
          <div className="card-heading"><div><h3>Probable scores</h3><p>Most likely exact results</p></div><Target size={16} color="hsl(var(--primary))" /></div>
          <div className="score-grid">
            {fixture.scores.map((score) => <div className="score-pill" key={score.score}><strong>{score.score}</strong><span>{score.probability}%</span></div>)}
          </div>
        </div>
        <div className="data-card" data-testid="card-team-form">
          <div className="card-heading"><div><h3>Recent form</h3><p>Last five competitive matches</p></div><TrendingUp size={16} color="hsl(var(--chart-2))" /></div>
          <div className="form-grid">
            <div className="form-team"><div className="form-team-name"><span className="mini-crest">{fixture.homeCode.slice(0, 2)}</span><span>{fixture.home}</span></div><FormDots results={fixture.homeForm} /></div>
            <div className="form-team"><div className="form-team-name"><span className="mini-crest">{fixture.awayCode.slice(0, 2)}</span><span>{fixture.away}</span></div><FormDots results={fixture.awayForm} /></div>
          </div>
        </div>
      </div>
      <div className="data-card goals-signals-card" data-testid="card-goals-signals">
        <div className="card-heading"><div><h3>Goals-related signals</h3><p>Derived from the available goal model inputs</p></div><BarChart3 size={16} color="hsl(var(--chart-2))" /></div>
        <div className="signal-grid">
          <div><span>Expected goals</span><strong>{(Number(fixture.homeGoals) + Number(fixture.awayGoals)).toFixed(2)}</strong></div>
          <div><span>Over 1.5</span><strong>{fixture.overUnder.over15}%</strong></div>
          <div><span>BTTS yes</span><strong>{fixture.btts.yes}%</strong></div>
        </div>
      </div>
      <PredictionSection fixture={fixture} status={status} />
    </>
  );
}

function Home() {
  const dataProvider = useMemo(() => createFootballDataProvider(), []);
  const dataStatus = dataProvider.status;
  const [query, setQuery] = useState('');
  const [league, setLeague] = useState<League>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [pinned, setPinned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => formatModelUpdated(new Date()));

  useEffect(() => {
    let cancelled = false;
    setIsLoadingData(true);
    setDataError(null);

    dataProvider.searchFixtures({ query, league })
      .then((results) => {
        if (cancelled) return;
        setFilteredFixtures(results);
        setSelectedId((currentId) => results.some((fixture) => fixture.id === currentId) ? currentId : results[0]?.id ?? null);
        setIsLoadingData(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFilteredFixtures([]);
        setSelectedId(null);
        setDataError('The football data provider could not be reached.');
        setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataProvider, league, query]);

  const selectedFixture = filteredFixtures.find((fixture) => fixture.id === selectedId) ?? null;

  function selectFixture(fixture: Fixture) {
    setSelectedId(fixture.id);
    setTab('overview');
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setSelectedId(null);
    setPinned(false);
    setTab('overview');
  }

  function handleLeagueChange(value: League) {
    setLeague(value);
    setSelectedId(null);
    setPinned(false);
    setTab('overview');
  }

  async function refreshModel() {
    setRefreshing(true);
    setDataError(null);

    try {
      await dataProvider.refresh();
      const results = await dataProvider.searchFixtures({ query, league });
      setFilteredFixtures(results);
      setSelectedId((currentId) => results.some((fixture) => fixture.id === currentId) ? currentId : results[0]?.id ?? null);
      setLastUpdated(formatModelUpdated(new Date()));
    } catch {
      setDataError('The football data provider could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="app-shell app-noise">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" data-testid="link-brand">
            <span className="brand-mark">FP</span>
            <span className="brand-name">Foot<span>Predict</span></span>
          </Link>
          <nav className="top-nav" aria-label="Primary navigation">
            <a href="#fixtures" aria-current="page" data-testid="link-fixtures">Fixtures</a>
            <a href="#analysis" data-testid="link-analysis">Analysis</a>
          </nav>
          <div className="status-chip"><span className={`status-dot ${dataStatus.source === 'demo' ? 'demo' : ''}`} /> {dataStatus.label}</div>
        </div>
      </header>
      <main className="page-wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">{formatHeroDate(new Date())} / matchday desk</p>
            <h1>Read the game<br /><em>before it starts.</em></h1>
            <p className="hero-copy">A focused pre-match read for the fixtures that matter. Find a game, see the signal, and know what is driving the numbers.</p>
          </div>
          <div className="model-note">
            <div className="model-note-label"><span>Data source</span><span>{dataStatus.label}</span></div>
            <strong>Last updated {lastUpdated}</strong>
            <p className="data-status-note">{dataStatus.description}</p>
            <div className={`model-line ${refreshing ? 'refreshing' : ''}`} />
          </div>
        </section>

        <section id="fixtures" aria-labelledby="search-heading">
          <p className="section-label" id="search-heading">Find a fixture</p>
          <div className="search-panel">
            <div className="search-row">
              <div className="search-input-wrap">
                <Search className="search-icon" />
                <input className="search-input" type="search" value={query} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search Leeds United, Arsenal, or a fixture…" aria-label="Search fixtures" data-testid="input-fixture-search" />
                {query && <button className="clear-search" onClick={() => handleSearchChange('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}
              </div>
              <button className={`filter-button ${league !== 'All' ? 'active' : ''}`} onClick={() => handleLeagueChange(league === 'All' ? 'Premier League' : 'All')} data-testid="button-filter-league">
                <Filter size={14} /> {league === 'All' ? 'All leagues' : league}
              </button>
            </div>
            <div className="league-filters" aria-label="League filters">
              {(['All', 'Premier League', 'La Liga', 'Champions League'] as League[]).map((item) => (
                <button className={`league-filter ${league === item ? 'active' : ''}`} key={item} onClick={() => handleLeagueChange(item)} data-testid={`button-league-${item.toLowerCase().replaceAll(' ', '-')}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="workspace">
          <aside className="fixture-sidebar" aria-label="Fixture list">
            <div className="section-label"><span>Upcoming</span><span className="fixture-count">{isLoadingData ? 'updating' : `${filteredFixtures.length} matches`}</span></div>
            {isLoadingData ? (
              <div className="sidebar-empty"><strong>Refreshing fixture data</strong>Checking the configured football provider.</div>
            ) : filteredFixtures.length > 0 ? (
              <div className="fixture-list">
                {filteredFixtures.map((fixture) => <FixtureItem fixture={fixture} selected={fixture.id === selectedId} onSelect={() => selectFixture(fixture)} key={fixture.id} />)}
              </div>
            ) : (
              <div className="sidebar-empty" data-testid="empty-fixture-list">
                <strong>No current fixture data</strong>
                {query ? `The configured provider has no data for “${query}”.` : 'There are no fixtures available for this league filter.'}
              </div>
            )}
          </aside>

          <section className="detail-panel" id="analysis" aria-label="Selected fixture analysis">
            <div className="detail-tabs" role="tablist" aria-label="Fixture detail views">
              <button className={`detail-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} role="tab" aria-selected={tab === 'overview'} data-testid="tab-overview">Overview</button>
              <button className={`detail-tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')} role="tab" aria-selected={tab === 'analysis'} data-testid="tab-analysis">Full analysis</button>
              <button className="detail-tab" onClick={refreshModel} role="button" data-testid="button-refresh-model"><RefreshCw size={13} className={refreshing ? 'refreshing' : ''} /> Refresh</button>
            </div>
            {isLoadingData ? (
              <div className="empty-state" data-testid="loading-analysis">
                <Clock3 size={24} />
                <div><h2>Loading fixture data</h2><p>Reading the current configured football provider.</p></div>
              </div>
            ) : dataError ? (
              <div className="empty-state" data-testid="data-error">
                <AlertTriangle size={24} />
                <div><h2>Data provider unavailable</h2><p>{dataError}</p></div>
                <button className="subtle-button" onClick={refreshModel} data-testid="button-retry-data">Try again</button>
              </div>
            ) : !selectedFixture ? (
              <div className="empty-state" data-testid="empty-analysis">
                <Search size={24} />
                <div><h2>No current fixture data</h2><p>{query ? `No ${dataStatus.label.toLowerCase()} fixture data is available for “${query}”. A live provider can be connected later without changing this interface.` : 'Choose a team, league, or fixture to begin.'}</p></div>
                <button className="subtle-button" onClick={() => { handleSearchChange(''); handleLeagueChange('All'); }} data-testid="button-reset-search">Reset fixture search</button>
              </div>
            ) : (
              <>
                <MatchHero fixture={selectedFixture} pinned={pinned} dataStatus={dataStatus} onPin={() => setPinned(!pinned)} onAnalysis={() => setTab('analysis')} />
                {tab === 'overview' ? <Overview fixture={selectedFixture} onAnalysis={() => setTab('analysis')} /> : <Analysis fixture={selectedFixture} status={dataStatus} />}
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="footer">
        <div className="topbar-inner" style={{ width: '100%' }}><span>FootPredict / matchday intelligence</span><span>Numbers explain the game. They do not decide it.</span></div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;