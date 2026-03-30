import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest", "back", "legs", "shoulders", "arms", "core",
]);

export const equipmentEnum = pgEnum("equipment", [
  "barbell", "dumbbell", "machine", "bodyweight", "cable",
]);

export const exercises = pgTable("exercises", {
  id:                uuid("id").primaryKey().defaultRandom(),
  name:              text("name").notNull().unique(),
  muscle_group:      muscleGroupEnum("muscle_group").notNull(),
  secondary_muscles: text("secondary_muscles").array(),
  equipment:         equipmentEnum("equipment"),
  instruction:       text("instruction"),
  created_at:        timestamp("created_at").notNull().defaultNow(),
});
