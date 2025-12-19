import { clickupRequest } from "../http";
import type { ClickUpTask } from "../types";

type TasksResponse = { tasks: ClickUpTask[] };

export async function getTasks(listId: string, page = 0) {
  // ClickUp tasks endpoint paginates; we start with minimal fields.
  return clickupRequest<TasksResponse>("GET", `/list/${listId}/task`, {
    page,
    include_closed: true,
    subtasks: true,
  });
}
