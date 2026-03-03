import { Hono } from "hono";
import {
  loginSchema,
  LoginSchema,
  RegisterInput,
  registerSchema,
} from "./schema";
import { registerUser, syncGoogleUser, userLogin } from "./service";
import { validate } from "../../core/middleware/validator";
import { authMiddleware } from "../../core/middleware/auth";

const auth = new Hono();

// register
auth.post("/signup", validate(registerSchema), async (c) => {
  try {
    const body = c.req.valid("json") as RegisterInput;
    const result = await registerUser(body);
    return c.json({ success: true, ...result }, 201);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message: message }, status);
  }
});

auth.post("/login", validate(loginSchema), async (c) => {
  try {
    const body = c.req.valid("json") as LoginSchema;
    const result = await userLogin(body);
    return c.json({ success: true, ...result }, 200);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message: message }, status);
  }
});
auth.post("/google-sync", async (c) => {
  const body = await c.req.json();
  const result = await syncGoogleUser(body);
  return c.json({ success: true, data: result }, 201);
});

auth.get("/test", authMiddleware, async (c) => {
  return c.json("validated");
});

export default auth;
