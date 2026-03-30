import { db } from "../../core/db/index.js";
import { workoutPlans } from "../../core/db/tables/workout_plans.js";
import { workoutDays } from "../../core/db/tables/workout_days.js";
import { workoutDayExercises } from "../../core/db/tables/workout_day_exercises.js";
import { exercises } from "../../core/db/tables/exercises.js";
import { inArray, eq, and, sql } from "drizzle-orm";
import { redisDelMany, redisGet, redisSet } from "../../utils/redis.js";
import {
  AddPlanExerciseInput,
  CreatePlanInput,
  UpdatePlanExerciseInput,
} from "./schema.js";

const PLAN_LIST_CACHE_TTL_SECONDS = 60 * 5;
const PLAN_DETAIL_CACHE_TTL_SECONDS = 60 * 5;
const ACTIVE_TODAY_CACHE_TTL_SECONDS = 60 * 5;

const getPlanListCacheKey = (userId: string) => `plans:list:${userId}`;
const getPlanDetailCacheKey = (userId: string, planId: string) =>
  `plans:detail:${userId}:${planId}`;
const getActiveTodayCacheKey = (userId: string, dayOfWeek: number) =>
  `plans:active-today:${userId}:${dayOfWeek}`;

const getAllPlanDetailCacheKeys = async (userId: string) => {
  const plans = await db
    .select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(eq(workoutPlans.user_id, userId));

  return plans.map((plan) => getPlanDetailCacheKey(userId, plan.id));
};

const invalidatePlanCaches = async (userId: string, planId?: string) => {
  const keys = [
    getPlanListCacheKey(userId),
    ...Array.from({ length: 7 }, (_, dayOfWeek) =>
      getActiveTodayCacheKey(userId, dayOfWeek),
    ),
  ];

  if (planId) {
    keys.push(getPlanDetailCacheKey(userId, planId));
  }

  const detailKeys = await getAllPlanDetailCacheKeys(userId);
  await redisDelMany([...new Set([...keys, ...detailKeys])]);
};

export const getPlans = async (userId: string) => {
  const cacheKey = getPlanListCacheKey(userId);
  const cachedPlans = await redisGet<typeof workoutPlans.$inferSelect[]>(cacheKey);

  if (cachedPlans) {
    return cachedPlans;
  }

  const plans = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.user_id, userId));

  await redisSet(cacheKey, plans, PLAN_LIST_CACHE_TTL_SECONDS);

  return plans;
};

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
  
  const result = await db.transaction(async (tx) => {
    // Insert plan
    const [plan] = await tx.insert(workoutPlans).values({
      user_id: userId,
      name: input.name,
      description: input.description,
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

  await invalidatePlanCaches(userId, result.plan.id);

  return result;
};

export const getPlanById = async (userId: string, planId: string) => {
 const cacheKey = getPlanDetailCacheKey(userId, planId);
 const cachedPlan = await redisGet<Awaited<ReturnType<typeof db.query.workoutPlans.findFirst>>>(
  cacheKey,
 );

 if (cachedPlan) {
  return cachedPlan;
 }

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

 await redisSet(cacheKey, plan, PLAN_DETAIL_CACHE_TTL_SECONDS);

 return plan;
};

export const getActiveTodaysWorkout = async (
  userId: string,
  dayOfWeek: number
) => {
  const cacheKey = getActiveTodayCacheKey(userId, dayOfWeek);
  const cachedWorkout = await redisGet<object>(cacheKey);

  if (cachedWorkout) {
    return cachedWorkout;
  }

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

  const workout = {
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

  await redisSet(cacheKey, workout, ACTIVE_TODAY_CACHE_TTL_SECONDS);

  return workout;
};

export const activatePlan = async (userId: string, planId: string) => {
  const result = await db.transaction(async (tx) => {
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

  await invalidatePlanCaches(userId, planId);

  return result;
};

export const deactivatePlan = async (userId: string, planId: string) => {
  const [updatedPlan] = await db
    .update(workoutPlans)
    .set({
      is_active: false,
      updated_at: new Date(),
    })
    .where(and(eq(workoutPlans.user_id, userId), eq(workoutPlans.id, planId)))
    .returning();

  if (!updatedPlan) {
    throw { message: "Plan not found", status: 404 };
  }

  await invalidatePlanCaches(userId, planId);

  return updatedPlan;
};

export const updatePlan = async (
  userId: string,
  planId: string,
  input: CreatePlanInput
) => {
  const result = await db.transaction(async (tx) => {
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
        description: input.description,
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

  await invalidatePlanCaches(userId, planId);

  return result;
};

const assertDayOwnership = async (userId: string, planId: string, dayId: string) => {
  const day = await db.query.workoutDays.findFirst({
    where: and(eq(workoutDays.id, dayId), eq(workoutDays.plan_id, planId)),
    with: {
      plan: true,
    },
  });

  if (!day || day.plan.user_id !== userId) {
    throw { message: "Plan day not found", status: 404 };
  }

  return day;
};

const assertExerciseExists = async (exerciseId: string) => {
  const [exercise] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.id, exerciseId));

  if (!exercise) {
    throw { message: "Exercise not found", status: 404 };
  }
};

export const addExerciseToPlanDay = async (
  userId: string,
  planId: string,
  dayId: string,
  input: AddPlanExerciseInput,
) => {
  await assertDayOwnership(userId, planId, dayId);
  await assertExerciseExists(input.exerciseId);

  const [created] = await db
    .insert(workoutDayExercises)
    .values({
      day_id: dayId,
      exercise_id: input.exerciseId,
      sets: input.sets,
      reps_min: input.repsMin,
      reps_max: input.repsMax,
      order: input.order ?? 0,
    })
    .returning();

  await invalidatePlanCaches(userId, planId);

  return created;
};

export const updateExerciseInPlanDay = async (
  userId: string,
  planId: string,
  dayId: string,
  exerciseRowId: string,
  input: UpdatePlanExerciseInput,
) => {
  await assertDayOwnership(userId, planId, dayId);

  if (input.exerciseId) {
    await assertExerciseExists(input.exerciseId);
  }

  const [existing] = await db
    .select()
    .from(workoutDayExercises)
    .where(
      and(
        eq(workoutDayExercises.id, exerciseRowId),
        eq(workoutDayExercises.day_id, dayId),
      ),
    );

  if (!existing) {
    throw { message: "Day exercise not found", status: 404 };
  }

  const [updated] = await db
    .update(workoutDayExercises)
    .set({
      exercise_id: input.exerciseId ?? existing.exercise_id,
      sets: input.sets ?? existing.sets,
      reps_min: input.repsMin ?? existing.reps_min,
      reps_max: input.repsMax ?? existing.reps_max,
      order: input.order ?? existing.order,
    })
    .where(eq(workoutDayExercises.id, exerciseRowId))
    .returning();

  await invalidatePlanCaches(userId, planId);

  return updated;
};

export const removeExerciseFromPlanDay = async (
  userId: string,
  planId: string,
  dayId: string,
  exerciseRowId: string,
) => {
  await assertDayOwnership(userId, planId, dayId);

  const [deleted] = await db
    .delete(workoutDayExercises)
    .where(
      and(
        eq(workoutDayExercises.id, exerciseRowId),
        eq(workoutDayExercises.day_id, dayId),
      ),
    )
    .returning();

  if (!deleted) {
    throw { message: "Day exercise not found", status: 404 };
  }

  await invalidatePlanCaches(userId, planId);

  return deleted;
};

export const deletePlan = async (userId: string, planId: string) => {
  const [deletedPlan] = await db
    .delete(workoutPlans)
    .where(and(eq(workoutPlans.user_id, userId), eq(workoutPlans.id, planId)))
    .returning();

  if (!deletedPlan) {
    throw { message: "Plan not found", status: 404 };
  }

  await invalidatePlanCaches(userId, planId);

  return deletedPlan;
};
