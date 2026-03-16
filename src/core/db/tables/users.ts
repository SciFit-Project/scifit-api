import { pgTable, uuid, text, timestamp, boolean, integer, real, pgEnum } from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["email", "google"]);
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const experienceLevelEnum = pgEnum("experience_level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const goalEnum = pgEnum("goal", ["CUTTING", "BULKING", "RECOMP"]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    provider: providerEnum("provider").notNull().default("email"),
    role: roleEnum("role").notNull().default("user"),
    gender: genderEnum("gender").notNull(),
    age: integer("age"),
    weightKg: real("weight_kg"),
    heightCm: real("height_cm"),
    experienceLevel: experienceLevelEnum("experience_level"),
    goal: goalEnum("goal"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});
