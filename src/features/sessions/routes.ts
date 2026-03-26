import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { startSessionSchema, logSetSchema, finishSessionSchema } from "./schema.js";
import * as sessionService from "./service.js";

const sessions = new Hono();

sessions.get("/history", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const history = await sessionService.getSessionHistory(authUser.id);
    return c.json({ success: true, data: history });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

sessions.post("/", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const body = await c.req.json();
    const parsed = startSessionSchema.parse(body);

    const session = await sessionService.startSession(authUser.id, parsed);
    return c.json({ success: true, data: session }, 201);
    
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

sessions.get("/:id", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const sessionId = c.req.param("id");
    const session = await sessionService.getSessionDetail(authUser.id, sessionId);
    return c.json({ success: true, data: session });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

sessions.put("/:id", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const sessionId = c.req.param("id");
    const body = await c.req.json();
    const parsed = finishSessionSchema.parse(body);

    const session = await sessionService.finishSession(authUser.id, sessionId, parsed);
    return c.json({ success: true, data: session });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

sessions.get("/:id/previous", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const sessionId = c.req.param("id");
    const previousSession = await sessionService.getPreviousSession(authUser.id, sessionId);
    return c.json({ success: true, data: previousSession });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

sessions.post("/:id/sets", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const sessionId = c.req.param("id");
    const body = await c.req.json();
    const parsed = logSetSchema.parse(body);

    const set = await sessionService.logSet(authUser.id, sessionId, parsed);
    return c.json({ success: true, data: set }, 201);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

export default sessions;
