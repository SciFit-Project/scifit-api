import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const sessions = new Hono();

sessions.get("/history", authMiddleware, async (c) => {});

sessions.post("/", authMiddleware, async (c) => {});
sessions.get("/:id", authMiddleware, async (c) => {});
sessions.put("/:id", authMiddleware, async (c) => {});

sessions.get("/:id/previous", authMiddleware, async (c) => {});

sessions.post("/:id/sets", authMiddleware, async (c) => {});
sessions.put("/:id/sets/:setId", authMiddleware, async (c) => {});
sessions.delete("/:id/sets/:setId", authMiddleware, async (c) => {});

export default sessions;
