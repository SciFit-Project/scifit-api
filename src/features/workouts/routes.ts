import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const workout = new Hono();

workout.get("/", authMiddleware, async (c) => {});

workout.get("/:id", authMiddleware, async (c) => {});

workout.get("/:id/today", authMiddleware, async (c) => {});

workout.post("/", authMiddleware, async (c) => {});

workout.put("/:id/activate", authMiddleware, async (c) => {});


export default workout;
