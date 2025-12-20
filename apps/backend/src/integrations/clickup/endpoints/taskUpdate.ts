import { clickupRequest } from "../http";
import type { ClickUpTask } from "../types";

export type ClickUpTaskUpdateInput = {
  name?: string;
  description?: string;
  status?: string;
  due_date?: number | null;
  time_estimate?: number | null;
  tags?: string[];
};

export async function updateTask(taskId: string, input: ClickUpTaskUpdateInput) {
  return clickupRequest<ClickUpTask>("PATCH", `/task/${taskId}`, undefined, input);
}
