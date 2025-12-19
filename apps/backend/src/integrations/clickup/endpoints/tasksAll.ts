import type { ClickUpTask } from "../types";
import { getTasks } from "./tasks";

export async function getAllTasks(listId: string) {
  const all: ClickUpTask[] = [];
  let page = 0;

  // ClickUp devuelve array; cuando queda vacío, terminamos.
  // (Si luego ClickUp cambia, ajustamos con metadata.)
  while (true) {
    const res = await getTasks(listId, page);
    if (!res.tasks.length) break;
    all.push(...res.tasks);
    page++;
    if (page > 10_000) throw new Error("Pagination runaway (safety stop)");
  }

  return all;
}
