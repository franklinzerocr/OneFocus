// apps/backend/src/integrations/clickup/client.ts
import { getTeams } from "./endpoints/teams";
import { getSpaces } from "./endpoints/spaces";
import { getFolders } from "./endpoints/folders";
import { getLists } from "./endpoints/lists";
import { getTasks } from "./endpoints/tasks";
import { getAllTasks } from "./endpoints/tasksAll";

import { clickupUpdateTask } from "./endpoints/taskUpdate";
import { clickupCreateTask } from "./endpoints/taskCreate";
import { clickupAddComment } from "./endpoints/taskComment";

export const clickup = {
  // Read
  getTeams,
  getSpaces,
  getFolders,
  getLists,
  getTasks,
  getAllTasks,

  // Write
  clickupUpdateTask,
  clickupCreateTask,
  clickupAddComment,
};
