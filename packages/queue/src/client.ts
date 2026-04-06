import Redis from "ioredis";
import { getRedisConfig } from "./config";

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (client) return client;

  const { url } = getRedisConfig();

  client = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) {
        console.error("[Redis] Max retry attempts reached. Giving up.");
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      console.warn(`[Redis] Retrying in ${delay}ms... (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ["READONLY", "ECONNRESET"];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  client.on("connect", () => console.log("[Redis] Connected"));
  client.on("ready", () => console.log("[Redis] Ready"));
  client.on("error", (err) => console.error("[Redis] Error:", err.message));
  client.on("close", () => console.warn("[Redis] Connection closed"));
  client.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedisClient();
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  await client.quit();
  client = null;
  console.log("[Redis] Disconnected");
}