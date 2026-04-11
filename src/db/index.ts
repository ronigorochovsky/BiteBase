import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Disable Vercel edge caching for all Neon HTTP queries
neonConfig.fetchOptions = { cache: "no-store" };

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
