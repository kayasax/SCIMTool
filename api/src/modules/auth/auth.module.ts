import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { SharedSecretGuard } from './shared-secret.guard';
import { OAuthModule } from '../../oauth/oauth.module';

@Module({
  imports: [ConfigModule, OAuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SharedSecretGuard
    }
  ]
})
export class AuthModule {}
