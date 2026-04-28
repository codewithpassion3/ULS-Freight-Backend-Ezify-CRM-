import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import session from 'express-session';
import connectRedis from "connect-redis";
const RedisStore = connectRedis(session);
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from './common/filters/global-exception-filter';
import { statiAssetPaths } from './utils/staticAssetPaths';
import * as express from 'express';
import { urlencoded } from 'express';
import { ENV } from './common/constants/env';
import { getEnv } from './utils/getEnv';
import { validateEnv } from './utils/validateEnv';
import { runSeeders } from './seeders/main.seeder';
import * as fs from 'fs';
import path from 'path'
import { EXPIRY_IN_MILISECONDS } from './common/constants/cookie';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './shared/redis/redis.module';
import 'dotenv/config';

async function bootstrap() {
    //1) Validate env keys
    validateEnv();

    //2) Check for certificates (.pem files) and create nestjs app
    const httpsKeyPath = path.join(process.cwd(), getEnv("CERTIFICATE_KEY"));
    const httpsCertPath = path.join(process.cwd(), getEnv("CERTIFICATE"));

    let httpsOptions: Record<string, any> | undefined;

    const hasCerts =
      fs.existsSync(httpsKeyPath) &&
      fs.existsSync(httpsCertPath);

    if (hasCerts && process.env.ENABLE_HTTPS === 'true') {
      httpsOptions = {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath),
      };
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      ...(httpsOptions ? { httpsOptions } : {}),
    });
  
    //3) Get express app instance
    const expressApp = app.getHttpAdapter().getInstance();
    
    //4) Make static asset reachable
    statiAssetPaths.forEach(({ path, prefix }) => {
      app.useStaticAssets(path, { prefix });
    });
    
    expressApp.set('trust proxy', 1);
    
    //5) Enable cors
    app.enableCors({
       origin: (origin, callback) => {
        const allowedOrigins = [
          getEnv(ENV.NG_ROK_ORIGIN_FRONTEND),
          getEnv(ENV.LOCALHOST_ORIGIN),
          getEnv(ENV.LIVE_ORIGIN_FRONTEND),
          getEnv(ENV.SSE_EVENTS)
        ].filter(Boolean); // remove undefined 🚀

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error('Blocked by CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
        "Last-Event-ID"
      ],
      exposedHeaders: ["Content-Type"],
    });
    
    //6) Get redis store for sessions
    const redisClient = app.get<Redis>(REDIS_CLIENT); // <-- CHANGED HERE
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: "sess:"
    })
  
    //7) Update sessions middleware
    app.use(session({
      store: redisStore,
      secret: getEnv(ENV.SESSION_SECRET),
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: 'none',
        secure: true,
        httpOnly: true,
        maxAge: EXPIRY_IN_MILISECONDS
      }
    }))
    
    //8) Limit request payload size
    app.use(express.json({ limit: "10kb" }));
    app.use(urlencoded({ limit: '10kb', extended: true }));
  
    //9) Validate and transform request payload
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
  
    //10) Set a global prefix for each api request
    app.setGlobalPrefix(`/api/${getEnv(ENV.API_VERSION)}`);
  
    //11) Catch global exceptions
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    //12) Setup mikro orm entities schema
    const orm = app.get(MikroORM);
    
    //13) Create tables 
    await orm.schema.updateSchema();
    
    //14) Add roles and permissions dummy data
    await runSeeders(orm.em);
    
    //15) Check for valid port
    const port = Number(getEnv(ENV.PORT))
    
    if (isNaN(port)) {
      throw new Error(`Invalid PORT: ${process.env.PORT}`);
    }
    
    //16) Start server
    await app.listen(port, '0.0.0.0');
}
bootstrap();
