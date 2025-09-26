import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'scimtool-oauth-secret-key-2025',
      signOptions: { 
        issuer: 'scimtool-oauth-server'
      },
    }),
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService], // Export for use in SCIM authentication
})
export class OAuthModule {}