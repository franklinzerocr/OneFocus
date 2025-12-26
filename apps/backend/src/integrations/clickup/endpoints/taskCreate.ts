// apps/backend/src/integrations/clickup/endpoints/taskCreate.ts
import { clickupRequest } from "../http";
import type { ClickUpTask, ClickUpCreateTaskInput } from "../types";

export async function clickupCreateTask(listId: string, input: ClickUpCreateTaskInput) {
  return clickupRequest<ClickUpTask>("POST", `/list/${listId}/task`, undefined, input);
}
