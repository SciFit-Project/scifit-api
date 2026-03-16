import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const workoutPlans = pgTable("workout_plans", {
  id:         uuid("id").primaryKey().defaultRandom(),
  user_id:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  frequency:  integer("frequency").notNull(),
  is_active:  boolean("is_active").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
