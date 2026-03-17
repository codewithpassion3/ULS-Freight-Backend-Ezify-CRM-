import { createClient } from "redis";
import { ENV } from "src/common/constants/env";
import { getEnv } from "src/utils/getEnv";

export const redisClient = createClient({
    url: getEnv(ENV.REDIS_CLIENT_URL)
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