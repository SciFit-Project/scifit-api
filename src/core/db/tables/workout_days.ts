import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";
import { workoutPlans } from "./workout_plans";

export const workoutDays = pgTable("workout_days", {
  id:          uuid("id").primaryKey().defaultRandom(),
  plan_id:     uuid("plan_id").notNull().references(() => workoutPlans.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  day_of_week: integer("day_of_week").notNull(),
  order:       integer("order").notNull(),
});
