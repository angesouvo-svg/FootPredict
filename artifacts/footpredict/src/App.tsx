import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
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

type Tab = 'overview' | 'analysis';
type League = 'All' | 'Premier League' | 'La Liga' | 'Champions League';
type Result = 'W' | 'D' | 'L';

type Fixture = {
  id: string;
  league: Exclude<League, 'All'>;
  date: string;
  kickoff: string;
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

const fixtures: Fixture[] = [
  {
    id: 'bou-liv',
    league: 'Premier League',
    date: 'Sat 15 Feb',
    kickoff: '15:00',
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
    date: 'Sat 15 Feb',
    kickoff: '17:30',
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
    date: 'Sun 16 Feb',
    kickoff: '20:00',
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
    date: 'Tue 18 Feb',
    kickoff: '20:00',
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
    date: 'Wed 19 Feb',
    kickoff: '19:45',
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
        <span>{fixture.league}</span>
        <span className="fixture-status">{fixture.kickoff}</span>
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

function MatchHero({ fixture, pinned, onPin, onAnalysis }: { fixture: Fixture; pinned: boolean; onPin: () => void; onAnalysis: () => void }) {
  return (
    <section className="match-card" data-testid={`card-selected-match-${fixture.id}`}>
      <div className="match-card-head">
        <span>{fixture.league} <span aria-hidden="true">·</span> {fixture.date}</span>
        <div className="match-card-tools">
          <span className="live-label"><span className="status-dot" /> model ready</span>
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
          <span>{fixture.kickoff}</span>
          <strong>vs</strong>
          <span>in {fixture.home === 'Bournemouth' ? '3 days' : '6 days'}</span>
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

function Analysis({ fixture }: { fixture: Fixture }) {
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
    </>
  );
}

function Home() {
  const [query, setQuery] = useState('');
  const [league, setLeague] = useState<League>('All');
  const [selectedId, setSelectedId] = useState('bou-liv');
  const [tab, setTab] = useState<Tab>('overview');
  const [pinned, setPinned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('08:42 UTC');

  const filteredFixtures = useMemo(() => {
    const term = query.trim().toLowerCase();
    return fixtures.filter((fixture) => {
      const matchesLeague = league === 'All' || fixture.league === league;
      const matchesSearch = !term || `${fixture.home} ${fixture.away} ${fixture.league}`.toLowerCase().includes(term);
      return matchesLeague && matchesSearch;
    });
  }, [league, query]);

  const selectedFixture = filteredFixtures.find((fixture) => fixture.id === selectedId) ?? filteredFixtures[0] ?? fixtures[0];

  function selectFixture(fixture: Fixture) {
    setSelectedId(fixture.id);
    setTab('overview');
  }

  function refreshModel() {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setLastUpdated('just now');
    }, 700);
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
          <div className="status-chip"><span className="status-dot" /> live model</div>
        </div>
      </header>
      <main className="page-wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">Saturday, 15 February 2025 / matchday desk</p>
            <h1>Read the game<br /><em>before it starts.</em></h1>
            <p className="hero-copy">A focused pre-match read for the fixtures that matter. Find a game, see the signal, and know what is driving the numbers.</p>
          </div>
          <div className="model-note">
            <div className="model-note-label"><span>Model status</span><span>v2.4</span></div>
            <strong>Updated {lastUpdated}</strong>
            <div className={`model-line ${refreshing ? 'refreshing' : ''}`} />
          </div>
        </section>

        <section id="fixtures" aria-labelledby="search-heading">
          <p className="section-label" id="search-heading">Find a fixture</p>
          <div className="search-panel">
            <div className="search-row">
              <div className="search-input-wrap">
                <Search className="search-icon" />
                <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Bournemouth, Liverpool, or a league…" aria-label="Search fixtures" data-testid="input-fixture-search" />
                {query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}
              </div>
              <button className={`filter-button ${league !== 'All' ? 'active' : ''}`} onClick={() => setLeague(league === 'All' ? 'Premier League' : 'All')} data-testid="button-filter-league">
                <Filter size={14} /> {league === 'All' ? 'All leagues' : league}
              </button>
            </div>
            <div className="league-filters" aria-label="League filters">
              {(['All', 'Premier League', 'La Liga', 'Champions League'] as League[]).map((item) => (
                <button className={`league-filter ${league === item ? 'active' : ''}`} key={item} onClick={() => setLeague(item)} data-testid={`button-league-${item.toLowerCase().replaceAll(' ', '-')}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="workspace">
          <aside className="fixture-sidebar" aria-label="Fixture list">
            <div className="section-label"><span>Upcoming</span><span className="fixture-count">{filteredFixtures.length} matches</span></div>
            {filteredFixtures.length > 0 ? (
              <div className="fixture-list">
                {filteredFixtures.map((fixture) => <FixtureItem fixture={fixture} selected={fixture.id === selectedId} onSelect={() => selectFixture(fixture)} key={fixture.id} />)}
              </div>
            ) : (
              <div className="sidebar-empty" data-testid="empty-fixture-list">
                <strong>No fixtures found</strong>
                Try another team, league, or clear the search.
              </div>
            )}
          </aside>

          <section className="detail-panel" id="analysis" aria-label="Selected fixture analysis">
            <div className="detail-tabs" role="tablist" aria-label="Fixture detail views">
              <button className={`detail-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} role="tab" aria-selected={tab === 'overview'} data-testid="tab-overview">Overview</button>
              <button className={`detail-tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')} role="tab" aria-selected={tab === 'analysis'} data-testid="tab-analysis">Full analysis</button>
              <button className="detail-tab" onClick={refreshModel} role="button" data-testid="button-refresh-model"><RefreshCw size={13} className={refreshing ? 'refreshing' : ''} /> Refresh</button>
            </div>
            {filteredFixtures.length === 0 ? (
              <div className="empty-state" data-testid="empty-analysis">
                <Search size={24} />
                <div><h2>Nothing matches that search</h2><p>FootPredict has a small, curated fixture board. Try “Bournemouth” or switch back to all leagues.</p></div>
                <button className="subtle-button" onClick={() => { setQuery(''); setLeague('All'); }} data-testid="button-reset-search">Reset fixture search</button>
              </div>
            ) : (
              <>
                <MatchHero fixture={selectedFixture} pinned={pinned} onPin={() => setPinned(!pinned)} onAnalysis={() => setTab('analysis')} />
                {tab === 'overview' ? <Overview fixture={selectedFixture} onAnalysis={() => setTab('analysis')} /> : <Analysis fixture={selectedFixture} />}
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