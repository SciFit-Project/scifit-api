import { Context, Next } from "hono";
import { sign, verify } from 'hono/jwt';
import { supabase } from "../db/index.js";


const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
                type: 'email_auth'
            });
            return await next();
        }
    } catch (e) {
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (user && !error) {
            c.set("user", {
                id: user.id,
                email: user.email,
                role: user.app_metadata?.role || "user",
                type: 'supabase_auth'
            });
            return await next();
        }
    } catch (e) {
    }

    return c.json({ message: "Unauthorized: Invalid or Expired Token" }, 401);
};

export const generateToken = async (user: { id: string, email: string, role: string }) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };
    return await sign(payload, JWT_SECRET, "HS256");
};