// apps/backend/src/integrations/clickup/endpoints/tasks.ts
import { clickupRequest } from "../http";
import type { ClickUpTask } from "../types";



type TasksResponse = { tasks: ClickUpTask[]; last_page?: boolean };

export async function getTasksPage(listId: string, page = 0): Promise<TasksResponse> {
  return clickupRequest<TasksResponse>("GET", `/list/${listId}/task`, {
    page,
    include_closed: true,
    subtasks: true,
  });
}

export async function getTasks(listId: string, page = 0) {
  return clickupRequest<TasksResponse>("GET", `/list/${listId}/task`, {
    page,
    include_closed: true,
    subtasks: true,
  });
}


export async function getTasksAll(listId: string): Promise<ClickUpTask[]> {
  const all: ClickUpTask[] = [];
  for (let page = 0; ; page++) {
    const res = await getTasksPage(listId, page);
    all.push(...(res.tasks ?? []));
    if (res.last_page === true) break;
    if (!res.tasks || res.tasks.length === 0) break; // fallback
  }
  return all;
}
