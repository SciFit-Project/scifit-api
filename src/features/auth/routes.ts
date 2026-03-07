import { Hono } from "hono";
import { validate } from "../../core/middleware/validator.js";
import { LoginSchema, loginSchema, RegisterInput, registerSchema } from "./schema.js";
import { getProfile, registerUser, syncGoogleUserLogin, syncGoogleUserRegister, userLogin } from "./service.js";
import { authMiddleware } from "../../core/middleware/auth.js";


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
auth.post("/google-sync-login", async (c) => {
  const body = await c.req.json();
  const result = await syncGoogleUserLogin(body);
  return c.json({ success: true, data: result }, 200);
});

auth.post("/google-sync-register", async (c) => {
  const body = await c.req.json();
  const result = await syncGoogleUserRegister(body);
  return c.json({ success: true, data: result }, 201);
});

auth.get("/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
    console.log(typeof user.id);
    const response = await getProfile(user.id);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    return c.json({ success: true, ...response }, 200);

  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message: message }, status);
  }
});

export default auth;
