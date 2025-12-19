import { getTeams } from "./endpoints/teams";
import { getSpaces } from "./endpoints/spaces";
import { getFolders } from "./endpoints/folders";
import { getLists } from "./endpoints/lists";
import { getTasks } from "./endpoints/tasks";

export const clickup = {
  getTeams,
  getSpaces,
  getFolders,
  getLists,
  getTasks,
};
