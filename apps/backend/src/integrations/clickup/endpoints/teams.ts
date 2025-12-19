import { clickupRequest } from "../http";
import type { ClickUpTeam } from "../types";

type TeamsResponse = { teams: ClickUpTeam[] };

export async function getTeams() {
  return clickupRequest<TeamsResponse>("GET", "/team");
}
