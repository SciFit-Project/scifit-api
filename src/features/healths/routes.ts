import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const health = new Hono();

health.post("/sync", authMiddleware, async (c) => {});

health.post("/manual", authMiddleware, async (c) => {});

health.get("/summary", authMiddleware, async (c) => {});

export default health;
