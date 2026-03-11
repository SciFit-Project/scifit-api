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

const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
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

serve(
  {
    fetch: app.fetch,
    port: 8080,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

export default app;
