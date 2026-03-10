import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";

const sessions = new Hono();

sessions.post("/", authMiddleware, async (c) => {});

sessions.put("/:id", authMiddleware, async (c) => {});

sessions.post("/:id/sets", authMiddleware, async (c) => {});

sessions.put("/:id/sets/setId", authMiddleware, async (c) => {});

sessions.delete("/:id/sets/setId", authMiddleware, async (c) => {});

sessions.get("/:id/sets/previous", authMiddleware, async (c) => {});

sessions.get("/history", authMiddleware, async (c) => {});

sessions.get("/:id", authMiddleware, async (c) => {});


export default sessions;
