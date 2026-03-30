import { pgTable, uuid, integer } from "drizzle-orm/pg-core";
import { workoutDays } from "./workout_days.js";
import { exercises } from "./exercises.js";

export const workoutDayExercises = pgTable("workout_day_exercises", {
  id:          uuid("id").primaryKey().defaultRandom(),
  day_id:      uuid("day_id").notNull().references(() => workoutDays.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id").notNull().references(() => exercises.id),
  sets:        integer("sets").notNull(),
  reps_min:    integer("reps_min"),
  reps_max:    integer("reps_max"),
  order:       integer("order").notNull(),
});
