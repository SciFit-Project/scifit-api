import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    role: text("role").default("user"),
    password: text("password"),

    provider: text("provider").default("email"), // "email", "google", "apple"
    createdAt: timestamp("created_at").defaultNow().notNull(),
});