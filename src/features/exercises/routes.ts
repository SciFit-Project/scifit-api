import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const exercises = new Hono();

exercises.get("/", authMiddleware, async (c) => {
  const {
    muscle_group,
    equiment,
    search,
    page = 1,
    limit = 20,
  } = c.req.query();
  return c.json({ message: "hello" });
});

exercises.get("/:id", authMiddleware, async (c) => {});

export default exercises;
