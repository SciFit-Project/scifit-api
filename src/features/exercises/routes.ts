import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { db } from "../../core/db/index.js";
import { exercises } from "../../core/db/tables/exercises.js";

const exerciseRouter = new Hono();

exerciseRouter.get("/", authMiddleware, async (c) => {
  try {
    const allExercises = await db.select().from(exercises);
    return c.json({ success: true, data: allExercises });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  } 
});

exerciseRouter.get("/:id", authMiddleware, async (c) => {});

export default exerciseRouter;
