import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from './mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [MikroOrmModule.forRoot({
    ...config,
    autoLoadEntities: true
  }),
  AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
