import { clickupRequest } from "../http";
import type { ClickUpFolder } from "../types";

type FoldersResponse = { folders: ClickUpFolder[] };

export async function getFolders(spaceId: string) {
  return clickupRequest<FoldersResponse>("GET", `/space/${spaceId}/folder`, {
    archived: false,
  });
}
