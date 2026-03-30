import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { validate } from "../../core/middleware/validator.js";
import {
  createPlanSchema,
  CreatePlanInput,
  addPlanExerciseSchema,
  updatePlanExerciseSchema,
  AddPlanExerciseInput,
  UpdatePlanExerciseInput,
} from "./schema.js";
import {
  createPlan,
  getPlanById,
  getActiveTodaysWorkout,
  activatePlan,
  deactivatePlan,
  updatePlan,
  addExerciseToPlanDay,
  updateExerciseInPlanDay,
  removeExerciseFromPlanDay,
  getPlans,
  deletePlan,
} from "./service.js";

const plan = new Hono();

plan.get("/active/today", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const today = new Date().getDay();
    const data = await getActiveTodaysWorkout(user.id, today);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      error.status || 500,
    );
  }
});

plan.get("/", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const plans = await getPlans(authUser.id);
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

plan.get("/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
    const id = c.req.param("id");

    const data = await getPlanById(user.id, id);

    return c.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      error.status || 500,
    );
  }
});

plan.put("/:id", authMiddleware, validate(createPlanSchema), async (c) => {
  try {
    const user = c.get("user" as any);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const id = c.req.param("id");
    const body = c.req.valid("json") as CreatePlanInput;

    const result = await updatePlan(user.id, id, body);

    return c.json({ success: true, ...result });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

plan.delete("/:id", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const id = c.req.param("id");
    await deletePlan(authUser.id, id);

    return c.json({ success: true });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";

    return c.json({ success: false, message }, status);
  }
});

plan.put("/:id/activate", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const id = c.req.param("id");
    const data = await activatePlan(user.id, id);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      error.status || 500
    );
  }
});

plan.put("/:id/deactivate", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const id = c.req.param("id");
    const data = await deactivatePlan(user.id, id);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      error.status || 500,
    );
  }
});

plan.put("/:id/today", authMiddleware, async (c) => {
  return c.json({ success: false, message: "Not implemented" }, 501);
});

plan.post(
  "/:id/days/:dayId/exercises",
  authMiddleware,
  validate(addPlanExerciseSchema),
  async (c) => {
    try {
      const user = c.get("user" as any);
      const id = c.req.param("id");
      const dayId = c.req.param("dayId");
      const body = c.req.valid("json") as AddPlanExerciseInput;

      const data = await addExerciseToPlanDay(user.id, id, dayId, body);
      return c.json({ success: true, data }, 201);
    } catch (error: any) {
      return c.json(
        { success: false, message: error.message },
        error.status || 500,
      );
    }
  },
);
plan.put(
  "/:id/days/:dayId/exercises/:exId",
  authMiddleware,
  validate(updatePlanExerciseSchema),
  async (c) => {
    try {
      const user = c.get("user" as any);
      const id = c.req.param("id");
      const dayId = c.req.param("dayId");
      const exId = c.req.param("exId");
      const body = c.req.valid("json") as UpdatePlanExerciseInput;

      const data = await updateExerciseInPlanDay(user.id, id, dayId, exId, body);
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json(
        { success: false, message: error.message },
        error.status || 500,
      );
    }
  },
);
plan.delete(
  "/:id/days/:dayId/exercises/:exId",
  authMiddleware,
  async (c) => {
    try {
      const user = c.get("user" as any);
      const id = c.req.param("id");
      const dayId = c.req.param("dayId");
      const exId = c.req.param("exId");

      const data = await removeExerciseFromPlanDay(user.id, id, dayId, exId);
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json(
        { success: false, message: error.message },
        error.status || 500,
      );
    }
  },
);

export default plan;
