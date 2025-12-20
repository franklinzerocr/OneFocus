import { getTeams } from "./endpoints/teams";
import { getSpaces } from "./endpoints/spaces";
import { getFolders } from "./endpoints/folders";
import { getLists } from "./endpoints/lists";
import { getTasks } from "./endpoints/tasks";
import { getAllTasks } from "./endpoints/tasksAll";

import { updateTask } from "./endpoints/taskUpdate";
import { createTask } from "./endpoints/taskCreate";
import { addTaskComment } from "./endpoints/taskComment";

export const clickup = {
  // Read
  getTeams,
  getSpaces,
  getFolders,
  getLists,
  getTasks,
  getAllTasks,

  // Write
  updateTask,
  createTask,
  addTaskComment,
};
