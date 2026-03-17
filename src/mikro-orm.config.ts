import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Options } from "@mikro-orm/core";
import 'dotenv/config'
import { ENV } from "./common/constants/env";
import { getEnv } from "./utils/getEnv";

const config: Options<PostgreSqlDriver> = {
    driver: PostgreSqlDriver,
    host: getEnv(ENV.DB_HOST),
    user: getEnv(ENV.DB_USER),
    password: getEnv(ENV.DB_PASSWORD),
    dbName: getEnv(ENV.DB_NAME),
    port: Number(getEnv(ENV.DB_PORT)),
    debug: getEnv(ENV.NODE_ENV) !== 'production',
    migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations'
    },
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts']
}

export default config;