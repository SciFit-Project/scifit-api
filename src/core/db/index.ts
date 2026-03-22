import { configDotenv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from "@supabase/supabase-js";
import * as schema from "./schema/schema.js";

configDotenv();

const client = postgres(process.env.SUPABASE_URL!); 
export const db = drizzle(client, { schema });

export const supabase = createClient(
    process.env.SUPABASE_URL_CONNECT!,
    process.env.SUPABASE_ANON_KEY!
);