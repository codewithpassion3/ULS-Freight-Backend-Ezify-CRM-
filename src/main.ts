import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.setGlobalPrefix(`/api/${process.env.API_VERSION || 'v1'}`);

  const orm = app.get(MikroORM);
  await orm.schema.updateSchema();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
