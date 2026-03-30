import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { db } from "../../core/db/index.js";
import { exercises } from "../../core/db/tables/exercises.js";
import { redisGet, redisSet } from "../../utils/redis.js";

const exerciseRouter = new Hono();
const EXERCISES_CACHE_KEY = "exercises:all";
const EXERCISES_CACHE_TTL_SECONDS = 60 * 10;

exerciseRouter.get("/", authMiddleware, async (c) => {
  try {
    const cachedExercises = await redisGet<typeof exercises.$inferSelect[]>(
      EXERCISES_CACHE_KEY,
    );

    if (cachedExercises) {
      return c.json({ success: true, data: cachedExercises });
    }

    const allExercises = await db.select().from(exercises);
    await redisSet(EXERCISES_CACHE_KEY, allExercises, EXERCISES_CACHE_TTL_SECONDS);

    return c.json({ success: true, data: allExercises });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  } 
});

exerciseRouter.get("/:id", authMiddleware, async (c) => {});

export default exerciseRouter;
