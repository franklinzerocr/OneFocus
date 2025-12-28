import { getTasks } from "./tasks";
import type { ClickUpTask } from "../types";

type GetTasksResponse = {
  tasks?: ClickUpTask[];
};

export async function getAllTasks(listId: string): Promise<ClickUpTask[]> {
  const all: ClickUpTask[] = [];
  let page = 0;

  for (;;) {
    const res = (await getTasks(listId, page)) as GetTasksResponse;
    const chunk = res.tasks ?? [];
    if (chunk.length === 0) break;

    all.push(...chunk);
    page += 1;
  }

  return all;
}
