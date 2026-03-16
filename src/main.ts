import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { connectRedis } from './config/redis.config';
import { seedRolesAndPermissions } from './utils/seedRolesAndPermissions';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from './common/filters/global-exception-filter';
import { statiAssetPaths } from './utils/staticAssetPaths';
import * as express from 'express';
import { urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  
  statiAssetPaths.forEach(({ path, prefix }) => {
    app.useStaticAssets(path, { prefix });
  });
  
  expressApp.set('trust proxy', 1);
  
  app.enableCors({
    origin:  [
      process.env.NG_ROK_ORIGIN_FRONTEND || "https://matrimonial-ecospecifically-jeni.ngrok-free.dev",
      process.env.LOCALHOST_ORIGIN || "http://localhost:3000"     
    ],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning"
    ]
  });
  
  // Get redis store for sessions
  const redisClient = await connectRedis();
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "sess:"
  })

  // Update sessions middleware
  app.use(session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || 'l)ngliv#dsecretk$y',
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'none',
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }))
  
  // Limit request payload size
  app.use(express.json({ limit: "10kb" }));
  app.use(urlencoded({ limit: '10kb', extended: true }));

  // Validate and transform request payload
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Set a global prefix for each api request
  app.setGlobalPrefix(`/api/${process.env.API_VERSION || 'v1'}`);

  // Catch global exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Setup mikro orm entities schema
  const orm = app.get(MikroORM);
  
  await orm.schema.updateSchema();
  await seedRolesAndPermissions(orm.em);
  
  // Start server at 3000 port
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
