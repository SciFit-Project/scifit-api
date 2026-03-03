import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import auth from "./features/auth/routes";

export const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin.endsWith(".vercel.app") || origin === "http://localhost:3000"
        ? origin
        : "http://localhost:3000",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.route("/api/auth", auth);
app.get("/", (c) => c.json({ status: "ok" }));

// serve(
//   {
//     fetch: app.fetch,
//     port: 8080,
//   },
//   (info) => {
//     console.log(`Server is running on http://localhost:${info.port}`);
//   },
// );

// เช็กว่าถ้าไม่ใช่บน Vercel (รันในเครื่อง) ให้ใช้ Node Server ปกติ
if (process.env.NODE_ENV !== "production") {
  serve(
    {
      fetch: app.fetch,
      port: 8080,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );
}
