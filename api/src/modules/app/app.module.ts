import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { LoggingModule } from '../logging/logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScimModule } from '../scim/scim.module';
import { WebModule } from '../web/web.module';
import { OAuthModule } from '../../oauth/oauth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    LoggingModule,
    ScimModule,
    WebModule,
    OAuthModule
  ]
})
export class AppModule {}
