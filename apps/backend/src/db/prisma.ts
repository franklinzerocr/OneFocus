import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getConfig } from "../config";

const { env } = getConfig();

const pool = new Pool({
  connectionString: env.DATABASE_URL

});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
