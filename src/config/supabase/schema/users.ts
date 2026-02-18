import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey(), // = supabase user id
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    role: text("role").default("user"), // user / admin / teacher
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
