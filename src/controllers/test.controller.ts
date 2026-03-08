import type { Context } from "hono";
import { getHealthStatus } from "../services/test.service.js";

export const getHealth = async (c: Context) => {
  const health = getHealthStatus();
  return c.json(
    {
      message: "Status: OK",
      data: health,
    },
    200,
  );
};
