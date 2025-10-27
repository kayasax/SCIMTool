import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');

        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET is required in production to sign OAuth tokens.');
          }

          const generated = crypto.randomBytes(32).toString('hex');
          // eslint-disable-next-line no-console
          console.warn('[OAuth] Using development-only JWT secret (auto-generated). Configure JWT_SECRET for production.');

          return {
            secret: generated,
            signOptions: { issuer: 'scimtool-oauth-server' }
          };
        }

        return {
          secret,
          signOptions: { issuer: 'scimtool-oauth-server' }
        };
      },
    }),
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService], // Export for use in SCIM authentication
})
export class OAuthModule {}