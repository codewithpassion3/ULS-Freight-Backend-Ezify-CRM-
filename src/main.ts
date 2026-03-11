import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { connectRedis } from './config/redis.config';
import { seedRolesAndPermissions } from './utils/seedRolesAndPermissions';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true, // reflect request origin
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }

  }))
  
  // Validate and transform request payload
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Set a global prefix for each api request
  app.setGlobalPrefix(`/api/${process.env.API_VERSION || 'v1'}`);

  // Setup mikro orm entities schema
  const orm = app.get(MikroORM);
  
  await orm.schema.updateSchema();
  await seedRolesAndPermissions(orm.em);
  
  // Start server at 3000 port
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
