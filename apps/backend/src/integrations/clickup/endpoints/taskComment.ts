// apps/backend/src/integrations/clickup/endpoints/taskComment.ts
import { clickupRequest } from "../http";
import type { ClickUpComment } from "../types";

type AddCommentResponse = { comment: ClickUpComment };

export async function clickupAddComment(taskId: string, comment_text: string) {
  return clickupRequest<AddCommentResponse>("POST", `/task/${taskId}/comment`, undefined, {
    comment_text,
  });
}
