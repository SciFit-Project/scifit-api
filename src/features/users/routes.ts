import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const user = new Hono();

user.put("/profile", authMiddleware, async (c) => {
  return c.json({message: "hello"});
});

user.put("/goal", authMiddleware, async (c) => {
  return c.json({message: "hello"});
});

export default user;
