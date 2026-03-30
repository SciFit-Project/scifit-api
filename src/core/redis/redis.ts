import { configDotenv } from "dotenv";
import { createClient } from "redis";

configDotenv();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = createClient({
  url: redisUrl,
});

redis.on("error", (error) => {
  console.error("Redis Client Error", error);
});

redis.on("connect", () => {
  console.log("Redis client connected");
});

export const connectRedis = async () => {
  if (redis.isOpen) {
    return redis;
  }

  await redis.connect();
  return redis;
};
