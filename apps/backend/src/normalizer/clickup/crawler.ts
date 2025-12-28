import { getConfig } from "../../config";
import { getSpaces } from "../../integrations/clickup/endpoints/spaces";
import { getFolders } from "../../integrations/clickup/endpoints/folders";
import { getFolderLists, getSpaceLists } from "../../integrations/clickup/endpoints/lists";

export type WorkspaceSnapshotResult = {
  startedAt: string;
  finishedAt: string;
  listsTotal: number;
  listsSucceeded: number;
  listsFailed: number;
  failures: Array<{ listId: string; error: string }>;
};

type SnapshotListFn = (listId: string) => Promise<void>;

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function run() {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;

      // If someone passes a sparse array, protect worker from undefined.
      const item = items[current];
      if (item === undefined) {
        throw new Error(`mapLimit: items[${current}] is undefined (sparse array not supported)`);
      }

      results[current] = await worker(item);
    }
  }

  const runners = Array.from({ length: Math.max(1, limit) }, () => run());
  await Promise.all(runners);
  return results;
}

export async function snapshotWorkspaceFromSpaces(
  snapshotList: SnapshotListFn
): Promise<WorkspaceSnapshotResult> {
  const { env } = getConfig();
  const startedAt = new Date().toISOString();

  const workspaceId = env.CLICKUP_WORKSPACE_ID;
  if (!workspaceId) {
    throw new Error(
      "CLICKUP_WORKSPACE_ID is required to snapshot workspace (spaces->folders/lists->lists)."
    );
  }

  const spacesRes = await getSpaces(workspaceId);
  const spaceList = Array.isArray(spacesRes) ? spacesRes : spacesRes.spaces;

  const listIds: string[] = [];

  for (const space of spaceList) {
    const [foldersRes, spaceListsRes] = await Promise.all([
      getFolders(space.id),
      getSpaceLists(space.id),
    ]);

    const folders = Array.isArray(foldersRes) ? foldersRes : foldersRes.folders;
    const spaceLists = Array.isArray(spaceListsRes) ? spaceListsRes : spaceListsRes.lists;

    for (const l of spaceLists) listIds.push(String(l.id));

    for (const folder of folders) {
      const folderListsRes = await getFolderLists(folder.id);
      const folderLists = Array.isArray(folderListsRes) ? folderListsRes : folderListsRes.lists;
      for (const l of folderLists) listIds.push(String(l.id));
    }
  }

  const uniqueListIds = Array.from(new Set(listIds));
  const concurrency = env.SNAPSHOT_CONCURRENCY ?? 2;

  const failures: Array<{ listId: string; error: string }> = [];
  let ok = 0;

  await mapLimit(uniqueListIds, concurrency, async (listId) => {
    try {
      await snapshotList(listId);
      ok++;
    } catch (e) {
      failures.push({
        listId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  const finishedAt = new Date().toISOString();

  return {
    startedAt,
    finishedAt,
    listsTotal: uniqueListIds.length,
    listsSucceeded: ok,
    listsFailed: failures.length,
    failures,
  };
}
