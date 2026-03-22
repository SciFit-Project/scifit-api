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

export const getActiveTodaysWorkout = async (userId: string, dayOfWeek: number) => {
  const activePlanRow = await db
    .select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(
      and(
        eq(workoutPlans.user_id, userId),
        eq(workoutPlans.is_active, true)
      )
    );

  if (activePlanRow.length === 0) {
    throw { message: "No workout scheduled for today", status: 404 };
  }

  const planId = activePlanRow[0].id;

  const rows = await db
    .select({
      plan: workoutPlans,
      day: workoutDays,
      wde: workoutDayExercises,
      exercise: exercises,
    })
    .from(workoutPlans)
    .innerJoin(
      workoutDays,
      eq(workoutDays.plan_id, workoutPlans.id)
    )
    .leftJoin(
      workoutDayExercises,
      eq(workoutDayExercises.day_id, workoutDays.id)
    )
    .leftJoin(
      exercises,
      eq(exercises.id, workoutDayExercises.exercise_id)
    )
    .where(
      and(
        eq(workoutDays.plan_id, planId),
        eq(workoutDays.day_of_week, dayOfWeek)
      )
    )
    .orderBy(workoutDayExercises.order);

  if (rows.length === 0) {
    throw { message: "No workout scheduled for today", status: 404 };
  }

  const plan = rows[0].plan;
  const day = rows[0].day;

  const currentDay: any = {
    id: day.id,
    day_of_week: day.day_of_week,
    name: day.name,
    order: day.order,
    exercises: [],
  };

  for (const row of rows) {
    if (row.wde && row.exercise) {
      currentDay.exercises.push({
        id: row.wde.id,
        exercise: {
          id: row.exercise.id,
          name: row.exercise.name,
        },
        sets: row.wde.sets,
        reps_min: row.wde.reps_min,
        reps_max: row.wde.reps_max,
        order: row.wde.order,
      });
    }
  }

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      frequency: plan.frequency,
      is_active: plan.is_active,
    },
    ...currentDay,
  };
};

export const activatePlan = async (userId: string, planId: string) => {
  return db.transaction(async (tx) => {
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

export const updatePlan = async (userId: string, planId: string, input: CreatePlanInput) => {
  const exerciseIds = input.days.flatMap(day => day.exercises.map(ex => ex.exerciseId));

  const existingExercises = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));

  if (existingExercises.length !== new Set(exerciseIds).size) {
    throw { message: "One or more exercises do not exist", status: 400 };
  }
  
  return await db.transaction(async (tx) => {
    const [existingPlan] = await tx
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(
        and(
          eq(workoutPlans.id, planId),
          eq(workoutPlans.user_id, userId)
        )
      );

    if (!existingPlan) {
      throw { message: "Plan not found", status: 404 };
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

    for (let i = 0; i < input.days.length; i++) {
      const day = input.days[i];
      const [dayRecord] = await tx.insert(workoutDays).values({
        plan_id: updatedPlan.id,
        name: day.name,
        day_of_week: day.dayOfWeek,
        order: day.order ?? i,
      }).returning();

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

    return { plan: updatedPlan };
  });
};