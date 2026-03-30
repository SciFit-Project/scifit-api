import { and, desc, eq } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { healthLogs } from "../../core/db/tables/health_logs.js";
import { ManualHealthLogInput } from "./schema.js";
import { redisDel, redisGet, redisSet } from "../../utils/redis.js";

const HEALTH_SUMMARY_CACHE_TTL_SECONDS = 60 * 5;
const getHealthSummaryCacheKey = (userId: string) => `health:summary:${userId}`;

export const upsertManualHealthLog = async (
  userId: string,
  input: ManualHealthLogInput,
) => {
  const existing = await db.query.healthLogs.findFirst({
    where: and(eq(healthLogs.user_id, userId), eq(healthLogs.date, input.date)),
  });

  if (existing) {
    const [updated] = await db
      .update(healthLogs)
      .set({
        body_weight_kg: input.bodyWeightKg,
        source: "MANUAL",
      })
      .where(eq(healthLogs.id, existing.id))
      .returning();

    await redisDel(getHealthSummaryCacheKey(userId));

    return updated;
  }

  const [created] = await db
    .insert(healthLogs)
    .values({
      user_id: userId,
      date: input.date,
      body_weight_kg: input.bodyWeightKg,
      source: "MANUAL",
    })
    .returning();

  await redisDel(getHealthSummaryCacheKey(userId));

  return created;
};

export const deleteManualHealthLog = async (userId: string, date: string) => {
  const existing = await db.query.healthLogs.findFirst({
    where: and(eq(healthLogs.user_id, userId), eq(healthLogs.date, date)),
  });

  if (!existing) {
    return null;
  }

  const [deleted] = await db
    .delete(healthLogs)
    .where(eq(healthLogs.id, existing.id))
    .returning();

  await redisDel(getHealthSummaryCacheKey(userId));

  return deleted;
};

export const getHealthSummary = async (userId: string) => {
  const cacheKey = getHealthSummaryCacheKey(userId);
  const cachedSummary = await redisGet<{
    latestBodyWeight: {
      id: string;
      date: string;
      bodyWeightKg: number | null;
      source: string;
      createdAt: Date;
    } | null;
    bodyWeightLogs: Array<{
      id: string;
      date: string;
      bodyWeightKg: number | null;
      source: string;
      createdAt: Date;
    }>;
  }>(cacheKey);

  if (cachedSummary) {
    return cachedSummary;
  }

  const rows = await db.query.healthLogs.findMany({
    where: eq(healthLogs.user_id, userId),
    orderBy: [desc(healthLogs.date)],
  });

  const bodyWeightLogs = rows
    .filter((row) => row.body_weight_kg != null)
    .map((row) => ({
      id: row.id,
      date: row.date,
      bodyWeightKg: row.body_weight_kg,
      source: row.source,
      createdAt: row.created_at,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const summary = {
    latestBodyWeight:
      bodyWeightLogs.length === 0 ? null : bodyWeightLogs[bodyWeightLogs.length - 1],
    bodyWeightLogs,
  };

  await redisSet(cacheKey, summary, HEALTH_SUMMARY_CACHE_TTL_SECONDS);

  return summary;
};
