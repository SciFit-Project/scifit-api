import { db } from "../../core/db/index.js";
import { workoutPlans } from "../../core/db/tables/workout_plans.js";
import { workoutDays } from "../../core/db/tables/workout_days.js";
import { workoutDayExercises } from "../../core/db/tables/workout_day_exercises.js";
import { exercises } from "../../core/db/tables/exercises.js";
import { inArray, eq, and, sql } from "drizzle-orm";
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
      for (let j = 0; j < day.exercises.length; j++) {
        const exercise = day.exercises[j];
        await tx.insert(workoutDayExercises).values({
          day_id: dayRecord.id,
          exercise_id: exercise.exerciseId,
          sets: exercise.sets,
          reps_min: exercise.repsMin,
          reps_max: exercise.repsMax,
          order: exercise.order ?? j,
        });
      }
    }

    return { plan };
  });
};

export const getPlanById = async (userId: string, planId: string) => {
 const plan = await db.query.workoutPlans.findFirst({
  where : and(
    eq(workoutPlans.id, planId),
    eq(workoutPlans.user_id, userId)
  ),
  with : {
    days : {
      orderBy : workoutDays.order,
      with : {
        exercises : {
          orderBy : workoutDayExercises.order,
          with : {
            exercise : true,
          },
        },
      },
    },
  },
 });

 if (!plan) {
  throw { message: "Plan not found", status: 404 };
 }

 return plan;
};

export const getActiveTodaysWorkout = async (
  userId: string,
  dayOfWeek: number
) => {
  const plan = await db.query.workoutPlans.findFirst({
    where: and(
      eq(workoutPlans.user_id, userId),
      eq(workoutPlans.is_active, true)
    ),
    with: {
      days: {
        where: eq(workoutDays.day_of_week, dayOfWeek),
        with: {
          exercises: {
            orderBy: workoutDayExercises.order,
            with: {
              exercise: true,
            },
          },
        },
      },
    },
  });

  if (!plan || plan.days.length === 0) {
    throw { message: "No workout scheduled for today", status: 404 };
  }

  const day = plan.days[0];

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      frequency: plan.frequency,
      is_active: plan.is_active,
    },
    id: day.id,
    day_of_week: day.day_of_week,
    name: day.name,
    order: day.order,
    exercises: day.exercises.map((e) => ({
      id: e.id,
      exercise: {
        id: e.exercise.id,
        name: e.exercise.name,
      },
      sets: e.sets,
      reps_min: e.reps_min,
      reps_max: e.reps_max,
      order: e.order,
    })),
  };
};

export const activatePlan = async (userId: string, planId: string) => {
  return db.transaction(async (tx) => {
    const [targetPlan] = await tx
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(
        and(eq(workoutPlans.user_id, userId), eq(workoutPlans.id, planId)),
      );

    if (!targetPlan) {
      throw { message: "Plan not found", status: 404 };
    }

    const result = await tx
      .update(workoutPlans)
      .set({
        is_active: sql<boolean>`
          CASE 
            WHEN ${workoutPlans.id} = ${planId} THEN true
            ELSE false
          END
        `,
      })
      .where(eq(workoutPlans.user_id, userId))
      .returning();

    const activatedPlan = result.find((p) => p.id === planId);

    if (!activatedPlan) {
      throw { message: "Plan not found", status: 404 };
    }

    return activatedPlan;
  });
};

export const updatePlan = async (
  userId: string,
  planId: string,
  input: CreatePlanInput
) => {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(
        and(
          eq(workoutPlans.id, planId),
          eq(workoutPlans.user_id, userId)
        )
      );

    if (!plan) {
      throw { message: "Plan not found", status: 404 };
    }

    const exerciseIds = input.days.flatMap((d) =>
      d.exercises.map((e) => e.exerciseId)
    );

    const uniqueIds = [...new Set(exerciseIds)];

    if (uniqueIds.length) {
      const existing = await tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(inArray(exercises.id, uniqueIds));

      if (existing.length !== uniqueIds.length) {
        throw { message: "One or more exercises do not exist", status: 400 };
      }
    }

    const [updatedPlan] = await tx
      .update(workoutPlans)
      .set({
        name: input.name,
        frequency: input.frequency,
        updated_at: new Date(),
      })
      .where(eq(workoutPlans.id, planId))
      .returning();

    await tx.delete(workoutDays).where(eq(workoutDays.plan_id, planId));

    const dayValues = input.days.map((day, i) => ({
      plan_id: planId,
      name: day.name,
      day_of_week: day.dayOfWeek,
      order: day.order ?? i,
    }));

    const insertedDays = await tx
      .insert(workoutDays)
      .values(dayValues)
      .returning();

    const dayIdMap = new Map<number, string>();
    insertedDays.forEach((d, i) => {
      dayIdMap.set(i, d.id);
    });

    const exerciseValues = input.days.flatMap((day, i) =>
      day.exercises.map((ex, j) => ({
        day_id: dayIdMap.get(i)!,
        exercise_id: ex.exerciseId,
        sets: ex.sets,
        reps_min: ex.repsMin,
        reps_max: ex.repsMax,
        order: ex.order ?? j,
      }))
    );

    if (exerciseValues.length) {
      await tx.insert(workoutDayExercises).values(exerciseValues);
    }

    return { plan: updatedPlan };
  });
};
