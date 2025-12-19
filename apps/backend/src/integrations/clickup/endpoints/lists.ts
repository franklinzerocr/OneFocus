import { clickupRequest } from "../http";
import type { ClickUpList } from "../types";

type ListsResponse = { lists: ClickUpList[] };

export async function getFolderLists(folderId: string) {
  return clickupRequest<ListsResponse>("GET", `/folder/${folderId}/list`, { archived: false });
}

export async function getSpaceLists(spaceId: string) {
  return clickupRequest<ListsResponse>("GET", `/space/${spaceId}/list`, { archived: false });
}

// Convenience wrapper for client.ts
export async function getLists(params: { folderId?: string; spaceId?: string }) {
  if (params.folderId) return getFolderLists(params.folderId);
  if (params.spaceId) return getSpaceLists(params.spaceId);
  throw new Error("getLists requires folderId or spaceId");
}
