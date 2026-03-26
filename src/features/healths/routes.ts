import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { manualHealthLogSchema } from "./schema.js";
import * as healthService from "./service.js";

const health = new Hono();

health.post("/sync", authMiddleware, async (c) => {});

health.post("/manual", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const body = await c.req.json();
    const parsed = manualHealthLogSchema.parse(body);

    const log = await healthService.upsertManualHealthLog(authUser.id, parsed);
    return c.json({ success: true, data: log });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

health.delete("/manual/:date", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const date = c.req.param("date");
    const deleted = await healthService.deleteManualHealthLog(authUser.id, date);
    return c.json({ success: true, data: deleted });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

health.get("/summary", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user" as any);
    const summary = await healthService.getHealthSummary(authUser.id);
    return c.json({ success: true, data: summary });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

export default health;
