import { connectRedis } from "../core/redis/redis.js";

type RedisValue = string | number | boolean | object | null;

const parseRedisValue = <T>(value: string | null): T | null => {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

export const redisGet = async <T = string>(key: string): Promise<T | null> => {
  const redis = await connectRedis();
  const value = await redis.get(key);

  return parseRedisValue<T>(value);
};

export const redisSet = async (
  key: string,
  value: RedisValue,
  ttlSeconds?: number,
) => {
  const redis = await connectRedis();
  const serializedValue =
    typeof value === "string" ? value : JSON.stringify(value);

  if (ttlSeconds) {
    await redis.set(key, serializedValue, {
      EX: ttlSeconds,
    });
    return;
  }

  await redis.set(key, serializedValue);
};

export const redisDel = async (key: string) => {
  const redis = await connectRedis();
  return redis.del(key);
};

export const redisDelMany = async (keys: string[]) => {
  if (keys.length === 0) {
    return 0;
  }

  const redis = await connectRedis();
  return redis.del(keys);
};
