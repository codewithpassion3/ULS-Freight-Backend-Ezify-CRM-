import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { connectRedis } from './config/redis.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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

  // Run serialization on response object
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  // Set a global prefix for each api request
  app.setGlobalPrefix(`/api/${process.env.API_VERSION || 'v1'}`);

  // Setup mikro orm entities schema
  const orm = app.get(MikroORM);
  
  await orm.schema.updateSchema();
  
  // Start server at 3000 port
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
