import { Router, type IRouter } from "express";
import { ListFootballFixturesResponse, GetFootballFixtureAnalysisResponse } from "@workspace/api-zod";
import {
  clearFootballCache,
  getFootballFixtureAnalysis,
  listFootballFixtures,
  type League,
} from "../lib/football-data";

const router: IRouter = Router();
const leagues = new Set<League>(["All", "Premier League", "La Liga", "Champions League", "Bundesliga", "Serie A", "Ligue 1"]);

router.get("/football/fixtures", async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const rawLeague = typeof req.query.league === "string" ? req.query.league : "All";
  const league: League = leagues.has(rawLeague as League) ? rawLeague as League : "All";
  const response = await listFootballFixtures(query, league);
  res.json(ListFootballFixturesResponse.parse(response));
});

router.get("/football/fixtures/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const response = await getFootballFixtureAnalysis(rawId);
  if (!response.fixture) {
    res.status(404).json(GetFootballFixtureAnalysisResponse.parse(response));
    return;
  }
  res.json(GetFootballFixtureAnalysisResponse.parse(response));
});

router.post("/football/refresh", (_req, res): void => {
  clearFootballCache();
  res.json({ status: "ok" });
});

export default router;