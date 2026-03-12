import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from './mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from './email/email.module';
import { OtpModule } from './modules/otp/opt.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRoot({
      ...config,
      autoLoadEntities: true
    }),
    AuthModule,
    UserModule,
    EmailModule,
    OtpModule
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
