import { clickupRequest } from "../http";
import type { ClickUpTask, ClickUpCreateTaskInput } from "../types";

export async function createTask(listId: string, input: ClickUpCreateTaskInput) {
  return clickupRequest<ClickUpTask>("POST", `/list/${listId}/task`, undefined, input);
}
