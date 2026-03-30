import { relations } from "drizzle-orm";
import { workoutPlans } from "../tables/workout_plans.js";
import { workoutDays } from "../tables/workout_days.js";
import { workoutDayExercises } from "../tables/workout_day_exercises.js";
import { exercises } from "../tables/exercises.js";
import { workoutSessions } from "../tables/workout_sessions.js";
import { sessionSets } from "../tables/workout_sets.js";
import { users } from "../tables/users.js";

export const workoutPlansRelations = relations(workoutPlans, ({ many }) => ({
  days: many(workoutDays),
}));

export const workoutDaysRelations = relations(workoutDays, ({ one, many }) => ({
  plan: one(workoutPlans, {
    fields: [workoutDays.plan_id],
    references: [workoutPlans.id],
  }),
  exercises: many(workoutDayExercises),
  sessions: many(workoutSessions),
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

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.user_id],
      references: [users.id],
    }),
    workoutDay: one(workoutDays, {
      fields: [workoutSessions.workout_day_id],
      references: [workoutDays.id],
    }),
    sets: many(sessionSets),
  })
);

export const sessionSetsRelations = relations(
  sessionSets,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [sessionSets.session_id],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [sessionSets.exercise_id],
      references: [exercises.id],
    }),
  })
);