import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const plan = new Hono();

plan.get("/active/today", authMiddleware, async (c) => {});

plan.get("/", authMiddleware, async (c) => {});
plan.post("/", authMiddleware, async (c) => {});

plan.get("/:id", authMiddleware, async (c) => {});
plan.put("/:id", authMiddleware, async (c) => {});
plan.delete("/:id", authMiddleware, async (c) => {});
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
