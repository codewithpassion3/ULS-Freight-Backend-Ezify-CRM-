import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Options } from "@mikro-orm/core";
import 'dotenv/config'

const config: Options<PostgreSqlDriver> = {
    driver: PostgreSqlDriver,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 5432,
    debug: process.env.NODE_ENV !== 'production',
    migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations'
    },
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts']
}

export default config;