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
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRoot({
      ...config,
      autoLoadEntities: true
    }),
    MulterModule.register({
      dest: process.env.IMAGE_UPLOAD_DESTINATION || './uploads'
    }),
    AuthModule,
    UserModule,
    EmailModule,
    OtpModule,
    PermissionModule,
    RoleModule
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
