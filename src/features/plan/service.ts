import { db } from "../../core/db/index.js";
import { workoutPlans } from "../../core/db/tables/workout_plans.js";
import { workoutDays } from "../../core/db/tables/workout_days.js";
import { workoutDayExercises } from "../../core/db/tables/workout_day_exercises.js";
import { exercises } from "../../core/db/tables/exercises.js";
import { inArray } from "drizzle-orm";
import { CreatePlanInput } from "./schema.js";

export const createPlan = async (userId: string, input: CreatePlanInput) => {
  // Collect all exercise IDs
  const exerciseIds = input.days.flatMap(day => day.exercises.map(ex => ex.exerciseId));

  // Check if all exercises exist
  const existingExercises = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));

  if (existingExercises.length !== new Set(exerciseIds).size) {
    throw { message: "One or more exercises do not exist", status: 400 };
  }
  
  return await db.transaction(async (tx) => {
    // Insert plan
    const [plan] = await tx.insert(workoutPlans).values({
      user_id: userId,
      name: input.name,
      frequency: input.frequency,
    }).returning();

    // For each day
    for (let i = 0; i < input.days.length; i++) {
      const day = input.days[i];
      const [dayRecord] = await tx.insert(workoutDays).values({
        plan_id: plan.id,
        name: day.name,
        day_of_week: day.dayOfWeek,
        order: day.order ?? i,
      }).returning();

      // For each exercise
      for (const exercise of day.exercises) {
        await tx.insert(workoutDayExercises).values({
          day_id: dayRecord.id,
          exercise_id: exercise.exerciseId,
          sets: exercise.sets,
          reps_min: exercise.repsMin,
          reps_max: exercise.repsMax,
          order: exercise.order ?? 0,
        });
      }
    }

    return { plan };
  });
};