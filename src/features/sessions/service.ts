import { db } from "../../core/db/index.js";
import { workoutSessions } from "../../core/db/tables/workout_sessions.js";
import { sessionSets } from "../../core/db/tables/workout_sets.js";
import { workoutDays } from "../../core/db/tables/workout_days.js";
import { workoutPlans } from "../../core/db/tables/workout_plans.js";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { StartSessionInput, LogSetInput, FinishSessionInput } from "./schema.js";

const assertSessionOwnership = async (userId: string, sessionId: string) => {
  const session = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.id, sessionId),
      eq(workoutSessions.user_id, userId)
    )
  });

  if (!session) {
    throw { message: "Session not found", status: 404 };
  }

  return session;
};

export const startSession = async (userId: string, input: StartSessionInput) => {
  if (input.workoutDayId) {
    const day = await db.query.workoutDays.findFirst({
      where: eq(workoutDays.id, input.workoutDayId),
      with: { plan: true }
    });
    if (!day) {
      throw { message: `Workout day not found for ID: ${input.workoutDayId}`, status: 404 };
    }
    if (!day.plan) {
      throw { message: `Workout day found, but it has no associated plan (plan_id is null or invalid).`, status: 404 };
    }
    if (day.plan.user_id !== userId) {
      throw { message: `Unauthorized: This workout day belongs to user ${day.plan.user_id}, but you are logged in as ${userId}`, status: 403 };
    }
  }

  const [session] = await db.insert(workoutSessions).values({
    user_id: userId,
    workout_day_id: input.workoutDayId,
    description: input.description,
  }).returning();

  return session;
};

export const logSet = async (userId: string, sessionId: string, input: LogSetInput) => {
  await assertSessionOwnership(userId, sessionId);

  const [set] = await db.insert(sessionSets).values({
    session_id: sessionId,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    weight_kg: input.weightKg,
    reps: input.reps,
    rpe: input.rpe,
  }).returning();

  return set;
};

export const finishSession = async (userId: string, sessionId: string, input: FinishSessionInput) => {
  await assertSessionOwnership(userId, sessionId);

  const [updatedSession] = await db.update(workoutSessions).set({
    finished_at: new Date(input.finishedAt),
    notes: input.notes,
    perceived_exertion: input.perceivedExertion,
  })
  .where(eq(workoutSessions.id, sessionId))
  .returning();

  return updatedSession;
};

export const getSessionHistory = async (userId: string) => {
  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.user_id, userId),
    with: {
      workoutDay: {
        with: {
          plan: true,
        }
      },
      sets: true,
    },
    orderBy: [desc(workoutSessions.started_at)],
  });

  return sessions.map(session => {
    const totalVolume = session.sets.reduce((acc, set) => {
      return acc + (set.reps * (set.weight_kg ?? 0));
    }, 0);

    const validRpes = session.sets.filter(s => s.rpe != null).map(s => s.rpe!);
    const avgRpe = validRpes.length > 0 
      ? validRpes.reduce((a, b) => a + b, 0) / validRpes.length 
      : session.perceived_exertion ?? 0;

    let durationMin = 0;
    if (session.finished_at) {
      durationMin = Math.round((session.finished_at.getTime() - session.started_at.getTime()) / 60000);
    }

    return {
      id: session.id,
      date: session.started_at,
      durationMin,
      planName: session.workoutDay?.plan?.name ?? null,
      dayName: session.workoutDay?.name ?? null,
      totalVolume,
      avgRpe,
      calories: Math.round(durationMin * 5), // Mock calculation for now
    };
  });
};

export const getSessionDetail = async (userId: string, sessionId: string) => {
  const session = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.id, sessionId),
      eq(workoutSessions.user_id, userId)
    ),
    with: {
      workoutDay: {
        with: {
          plan: true,
        }
      },
      sets: {
        with: {
          exercise: true,
        },
        orderBy: (sessionSets, { asc }) => [asc(sessionSets.created_at)],
      }
    }
  });

  if (!session) {
    throw { message: "Session not found", status: 404 };
  }

  return session;
};

export const getPreviousSession = async (userId: string, sessionId: string) => {
  const currentSession = await assertSessionOwnership(userId, sessionId);

  if (!currentSession.workout_day_id) {
    throw { message: "Session is not linked to a workout day", status: 400 };
  }

  const previousSession = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.user_id, userId),
      eq(workoutSessions.workout_day_id, currentSession.workout_day_id),
      lt(workoutSessions.started_at, currentSession.started_at)
    ),
    orderBy: [desc(workoutSessions.started_at)],
    with: {
      sets: {
        with: {
          exercise: true,
        }
      }
    }
  });

  if (!previousSession) {
    throw { message: "No previous session found", status: 404 };
  }

  return previousSession;
};
