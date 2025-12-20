import { clickupRequest } from "../http";
import type { ClickUpComment } from "../types";

type AddCommentResponse = { comment: ClickUpComment };

export async function addTaskComment(taskId: string, comment_text: string) {
  return clickupRequest<AddCommentResponse>("POST", `/task/${taskId}/comment`, undefined, {
    comment_text,
  });
}
