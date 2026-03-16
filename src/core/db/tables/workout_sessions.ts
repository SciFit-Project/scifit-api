import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workoutDays } from "./workout_days";

export const workoutSessions = pgTable("workout_sessions", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  user_id:             uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workout_day_id:      uuid("workout_day_id").references(() => workoutDays.id, { onDelete: "set null" }),
  started_at:          timestamp("started_at").notNull().defaultNow(),
  finished_at:         timestamp("finished_at"),
  description: text("description"),
  notes:               text("notes"),
  perceived_exertion:  integer("perceived_exertion"),
});
