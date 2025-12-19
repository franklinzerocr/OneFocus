import { clickupRequest } from "../http";
import type { ClickUpSpace } from "../types";

type SpacesResponse = { spaces: ClickUpSpace[] };

export async function getSpaces(teamId: string) {
  return clickupRequest<SpacesResponse>("GET", `/team/${teamId}/space`, {
    archived: false,
  });
}
