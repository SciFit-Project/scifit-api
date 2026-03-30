import { configDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import * as schema from "./schema/schema.js";

configDotenv();

const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const client = postgres(getRequiredEnv("SUPABASE_URL"));
export const db = drizzle(client, { schema });

export const supabase = createClient(
  getRequiredEnv("SUPABASE_URL_CONNECT"),
  getRequiredEnv("SUPABASE_ANON_KEY"),
);
