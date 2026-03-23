import { relations } from "drizzle-orm";
import { workoutPlans } from "../tables/workout_plans.js";
import { workoutDays } from "../tables/workout_days.js";
import { workoutDayExercises } from "../tables/workout_day_exercises.js";
import { exercises } from "../tables/exercises.js";


export const workoutPlansRelations = relations(workoutPlans, ({ many }) => ({
  days: many(workoutDays),
}));

export const workoutDaysRelations = relations(workoutDays, ({ one, many }) => ({
  plan: one(workoutPlans, {
    fields: [workoutDays.plan_id],
    references: [workoutPlans.id],
  }),
  exercises: many(workoutDayExercises),
}));

export const workoutDayExercisesRelations = relations(
  workoutDayExercises,
  ({ one }) => ({
    day: one(workoutDays, {
      fields: [workoutDayExercises.day_id],
      references: [workoutDays.id],
    }),
    exercise: one(exercises, {
      fields: [workoutDayExercises.exercise_id],
      references: [exercises.id],
    }),
  })
);