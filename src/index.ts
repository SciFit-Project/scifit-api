import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import auth from "./features/auth/routes.js";
import user from "./features/users/routes.js";
import exercises from "./features/exercises/routes.js";
import sessions from "./features/sessions/routes.js";
import health from "./features/healths/routes.js";
import plan from "./features/plan/routes.js";
import { connectRedis } from "./core/redis/redis.js";

const app = new Hono();
const frontendOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const port = Number(process.env.PORT || 8080);

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: frontendOrigins,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.route("/api/auth", auth);

app.route("/api/users", user);

app.route("/api/exercises", exercises);

app.route("/api/plans", plan);

app.route("/api/sessions", sessions);

app.route("/api/health", health);

app.get("/", (c) => c.json({ status: "ok" }));

const bootstrap = async () => {
  await connectRedis();

  serve(
    {
      fetch: app.fetch,
      hostname: "0.0.0.0",
      port,
    },
    (info) => {
      console.log(`Server is running on http://0.0.0.0:${info.port}`);
    },
  );
};

bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});

export default app;
