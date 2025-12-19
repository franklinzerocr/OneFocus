import { clickup } from "../../integrations/clickup/client";
import { upsertProject } from "../../repositories/projectsRepo";
import { upsertTask } from "../../repositories/tasksRepo";
import { mapClickUpTask } from "./mapper";
import { IngestedProjectSchema } from "@onefocus/shared";

export async function syncClickUpList(listId: string, projectName = `ClickUp List ${listId}`) {
  const project = IngestedProjectSchema.parse({
    externalType: "list",
    externalId: listId,
    name: projectName,
    bucket: "primary_work",
  });

  const dbProject = await upsertProject(project);

  const tasks = await clickup.getAllTasks(listId);
  let upserted = 0;

  for (const t of tasks) {
    const mapped = mapClickUpTask(t);
    await upsertTask(mapped, dbProject.id);
    upserted++;
  }

  return { projectId: dbProject.id, tasksFetched: tasks.length, tasksUpserted: upserted };
}
