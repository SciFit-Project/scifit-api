import { Hono } from "hono";
import { authMiddleware } from "../../core/middleware/auth.js";
import { validate } from "../../core/middleware/validator.js";
import { updateProfileSchema, UpdateProfileInput } from "./schema.js";
import { updateProfile } from "./service.js";

const user = new Hono();

user.put("/profile", authMiddleware, validate(updateProfileSchema), async (c) => {
  try {
    const authUser = c.get("user" as any);
    const body = c.req.valid("json") as UpdateProfileInput;
    const result = await updateProfile(authUser.id, body);
    return c.json({ success: true, ...result });
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

user.put("/goal", authMiddleware, async (c) => {
  return c.json({message: "hello"});
});

export default user;
