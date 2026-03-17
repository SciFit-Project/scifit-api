import { Hono } from "hono";
import { validate } from "../../core/middleware/validator.js";
import {
  GoogleSyncInput,
  LoginSchema,
  googleSyncSchema,
  loginSchema,
  RegisterInput,
  registerSchema,
} from "./schema.js";
import {
  getProfile,
  registerUser,
  syncGoogleUser,
  syncGoogleUserLogin,
  syncGoogleUserRegister,
  userLogin,
} from "./service.js";
import { authMiddleware, refreshSession } from "../../core/middleware/auth.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const auth = new Hono();

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

    setCookie(c, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return c.json({ success: true, ...result }, 200);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message: message }, status);
  }
});

auth.post("/google-sync", authMiddleware, validate(googleSyncSchema), async (c) => {
  try {
    const user = c.get("user" as any);
    const body = c.req.valid("json") as GoogleSyncInput;
    const result = await syncGoogleUser(user, body);

    setCookie(c, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ success: true, ...result }, 200);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

auth.post("/google-sync-login", authMiddleware, validate(googleSyncSchema), async (c) => {
  try {
    const user = c.get("user" as any);
    const body = c.req.valid("json") as GoogleSyncInput;
    const result = await syncGoogleUserLogin(user, body);

    setCookie(c, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ success: true, ...result }, 200);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

auth.post("/google-sync-register", authMiddleware, validate(googleSyncSchema), async (c) => {
  try {
    const user = c.get("user" as any);
    const body = c.req.valid("json") as GoogleSyncInput;
    const result = await syncGoogleUserRegister(user, body);

    setCookie(c, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ success: true, ...result }, 200);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return c.json({ success: false, message }, status);
  }
});

auth.post("/logout", async (c) => {
  deleteCookie(c, "refreshToken", {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
  return c.json({ message: "Logged out successfully" });
});

auth.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, "refreshToken");

  if (!refreshToken) return c.json({ message: "No refresh token" }, 401);

  const result = await refreshSession(refreshToken);

  if (!result) {
    return c.json({ success: false, message: "Invalid or expired refresh token" }, 401);
  }

  return c.json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
});

auth.get("/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user" as any);
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
