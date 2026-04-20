// import { Redis } from "ioredis";
// import { ENV } from "src/common/constants/env";
// import { getEnv } from "src/utils/getEnv";

// export const redisClient = new Redis(getEnv(ENV.REDIS_CLIENT_URL));

// export async function connectRedis() {
//     redisClient.on("error", (error) => {
//         console.log("Redis connection error", error);
//     });

//     // ioredis connects automatically on first command, 
//     // but you can explicitly check status if needed
//     if (redisClient.status === "wait" || redisClient.status === "close") {
//         await redisClient.connect();
//     }

//     return redisClient;
// }