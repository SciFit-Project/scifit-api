import { db } from "../../core/db/index.js";
import { workoutSessions } from "../../core/db/tables/workout_sessions.js";
import { sessionSets } from "../../core/db/tables/workout_sets.js";
import { workoutDays } from "../../core/db/tables/workout_days.js";
import { eq, and, desc, lt } from "drizzle-orm";
import { StartSessionInput, LogSetInput, FinishSessionInput } from "./schema.js";
import { redisDelMany, redisGet, redisSet } from "../../utils/redis.js";

const SESSION_HISTORY_CACHE_TTL_SECONDS = 60 * 5;
const SESSION_DETAIL_CACHE_TTL_SECONDS = 60 * 5;
const PREVIOUS_SESSION_CACHE_TTL_SECONDS = 60 * 5;

const getSessionHistoryCacheKey = (userId: string) => `sessions:history:${userId}`;
const getSessionDetailCacheKey = (userId: string, sessionId: string) =>
  `sessions:detail:${userId}:${sessionId}`;
const getPreviousSessionCacheKey = (userId: string, sessionId: string) =>
  `sessions:previous:${userId}:${sessionId}`;

const getAllSessionCacheKeys = async (userId: string) => {
  const sessions = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(eq(workoutSessions.user_id, userId));

  return sessions.flatMap((session) => [
    getSessionDetailCacheKey(userId, session.id),
    getPreviousSessionCacheKey(userId, session.id),
  ]);
};

const invalidateSessionCaches = async (userId: string, sessionId?: string) => {
  const keys = [getSessionHistoryCacheKey(userId)];

  if (sessionId) {
    keys.push(
      getSessionDetailCacheKey(userId, sessionId),
      getPreviousSessionCacheKey(userId, sessionId),
    );
  }

  const relatedKeys = await getAllSessionCacheKeys(userId);
  await redisDelMany([...new Set([...keys, ...relatedKeys])]);
};

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
  const [session] = await db.insert(workoutSessions).values({
    user_id: userId,
    workout_day_id: input.workoutDayId,
    description: input.description,
  }).returning();

  await invalidateSessionCaches(userId, session.id);

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

  await invalidateSessionCaches(userId, sessionId);

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

  await invalidateSessionCaches(userId, sessionId);

  return updatedSession;
};

export const getSessionHistory = async (userId: string) => {
  const cacheKey = getSessionHistoryCacheKey(userId);
  const cachedHistory = await redisGet<object[]>(cacheKey);

  if (cachedHistory) {
    return cachedHistory;
  }

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

  const history = sessions.map(session => {
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

  await redisSet(cacheKey, history, SESSION_HISTORY_CACHE_TTL_SECONDS);

  return history;
};

export const getSessionDetail = async (userId: string, sessionId: string) => {
  const cacheKey = getSessionDetailCacheKey(userId, sessionId);
  const cachedSession = await redisGet<object>(cacheKey);

  if (cachedSession) {
    return cachedSession;
  }

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

  await redisSet(cacheKey, session, SESSION_DETAIL_CACHE_TTL_SECONDS);

  return session;
};

export const getPreviousSession = async (userId: string, sessionId: string) => {
  const cacheKey = getPreviousSessionCacheKey(userId, sessionId);
  const cachedPreviousSession = await redisGet<object | null>(cacheKey);

  if (cachedPreviousSession) {
    return cachedPreviousSession;
  }

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
      workoutDay: {
        with: {
          plan: true,
        }
      },
      sets: {
        with: {
          exercise: true,
        }
        ,
        orderBy: (sessionSets, { asc }) => [asc(sessionSets.created_at)],
      }
    }
  });

  if (!previousSession) {
    return null;
  }

  await redisSet(cacheKey, previousSession, PREVIOUS_SESSION_CACHE_TTL_SECONDS);

  return previousSession;
};
