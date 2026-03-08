import { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";
import { supabase } from "../db/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH || "refresh_secret";

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized: Missing Token" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    if (payload) {
      c.set("user", {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        type: "email_auth",
      });
      return await next();
    }
  } catch (e) {}

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (user && !error) {
      c.set("user", {
        id: user.id,
        email: user.email,
        role: user.app_metadata?.role || "user",
        type: "supabase_auth",
      });
      return await next();
    }
  } catch (e) {}

  return c.json({ message: "Unauthorized: Invalid or Expired Token" }, 401);
};

export const generateTokens = async (user: {
  id: string;
  email?: string;
  role?: string;
}) => {
  const accessPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
  };

  const refreshPayload = {
    id: user.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };

  const accessToken = await sign(accessPayload, JWT_SECRET, "HS256");
  const refreshToken = await sign(refreshPayload, JWT_SECRET_REFRESH, "HS256");

  return { accessToken, refreshToken };
};

export const refreshSession = async (refreshToken: string) => {
  try {
    const payload = await verify(refreshToken, JWT_SECRET_REFRESH, "HS256");

    const accessToken = await sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      },
      JWT_SECRET,
      "HS256",
    );

    return { accessToken, user: payload };
  } catch (e) {
    return null;
  }
};
