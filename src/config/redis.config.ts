import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_CLIENT_URL || "redis://localhost:6397"
})

export async function connectRedis(){
    redisClient.on("error",(error) => {
        console.log("Redis connection error", error)
    })

    if(!redisClient.isOpen){
        await redisClient.connect();
    }

    return redisClient;
}