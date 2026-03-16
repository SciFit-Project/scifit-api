import { pgTable, timestamp, uuid, integer, real } from "drizzle-orm/pg-core";
import { workoutSessions } from "./workout_sessions";
import { exercises } from "./exercises";

export const sessionSets = pgTable("session_sets", {
  id:          uuid("id").primaryKey().defaultRandom(),
  session_id:  uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id").notNull().references(() => exercises.id),
  set_number:  integer("set_number").notNull(),
  weight_kg:   real("weight_kg"),
  reps:        integer("reps").notNull(),
  rpe:         real("rpe"),
  created_at:  timestamp("created_at").notNull().defaultNow(),
});
