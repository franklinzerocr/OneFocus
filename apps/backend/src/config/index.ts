import { loadEnv } from "./env";

export const config = {
  env: loadEnv()
} as const;
