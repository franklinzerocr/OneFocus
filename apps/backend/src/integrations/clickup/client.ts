// apps/backend/src/integrations/clickup/client.ts
import { getTeams } from "./endpoints/teams";
import { getSpaces } from "./endpoints/spaces";
import { getFolders } from "./endpoints/folders";
import { getLists, getList } from "./endpoints/lists";
import { getTasks } from "./endpoints/tasks";
import { getAllTasks } from "./endpoints/tasksAll";
// apps/backend/src/integrations/clickup/client.ts


import { clickupUpdateTask } from "./endpoints/taskUpdate";
import { clickupCreateTask } from "./endpoints/taskCreate";
import { clickupAddComment } from "./endpoints/taskComment";

// ✅ named exports expected by normalizer routes
export { getList, getTasks };

export const clickup = {
  // Read
  getTeams,
  getSpaces,
  getFolders,
  getLists,
  getList,
  getTasks,
  getAllTasks,

  // Write
  updateTask: clickupUpdateTask,
  createTask: clickupCreateTask,
  addTaskComment: clickupAddComment,
};


