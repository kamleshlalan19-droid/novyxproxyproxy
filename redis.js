import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

const redisClient = createClient(
    redisUrl
        ? {
              url: redisUrl,
          }
        : undefined
);

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

const redisReady = redisClient.connect().catch((error) => {
    console.error("Redis connect error:", error);
});

export const ensureRedis = async () => {
    await redisReady;
    return redisClient;
};

export default redisClient;
