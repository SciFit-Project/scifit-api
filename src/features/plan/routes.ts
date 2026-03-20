import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { validate } from "../../core/middleware/validator.js";
import { db } from "../../core/db/index.js";
import { eq, and } from "drizzle-orm";
import { workoutPlans } from "../../core/db/tables/workout_plans.js";
import { createPlanSchema, CreatePlanInput } from "./schema.js";
import { createPlan } from "./service.js";

const plan = new Hono();

plan.get("/active/today", authMiddleware, async (c) => {});

plan.get("/", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const plans = await db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.user_id, authUser.id));
    return c.json({ success: true, data: plans });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

plan.post("/", authMiddleware, validate(createPlanSchema), async (c) => {
  try {
    const authUser = c.get("user" as any);
    const body = c.req.valid("json") as CreatePlanInput;
    const result = await createPlan(authUser.id, body);
    return c.json({ success: true, ...result }, 201);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

plan.get("/:id", authMiddleware, async (c) => {});
plan.put("/:id", authMiddleware, async (c) => {});
plan.delete("/:id", authMiddleware, async (c) => {
  /*delete plan by id */
  try {
    const authUser = c.get("user" as any);
    const id = c.req.param("id");
    
    const result = await db
      .delete(workoutPlans)
      .where(and(eq(workoutPlans.user_id, authUser.id), eq(workoutPlans.id, id)))
      .returning();
    
    if (result.length === 0) {
      return c.json({ success: false, message: "Plan not found" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    
    return c.json({ success: false, message }, status);
  }
});

plan.put("/:id/activate", authMiddleware, async (c) => {});
plan.put("/:id/today", authMiddleware, async (c) => {});

plan.post("/:id/days/:dayId/exercises", authMiddleware, async (c) => {});
plan.put("/:id/days/:dayId/exercises/:exId", authMiddleware, async (c) => {});
plan.delete(
  "/:id/days/:dayId/exercises/:exId",
  authMiddleware,
  async (c) => {},
);

export default plan;
