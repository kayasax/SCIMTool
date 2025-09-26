import { Body, Controller, Get, Post, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../modules/auth/public.decorator';
import { OAuthService } from './oauth.service';

export interface TokenRequest {
  grant_type: string;
  client_id: string;
  client_secret: string;
  scope?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get('test')
  testEndpoint() {
    return { message: 'OAuth controller is working!', timestamp: new Date().toISOString(), version: '1.1' };
  }

  @Public()
  @Post('token')
  async getToken(@Body() tokenRequest: TokenRequest): Promise<TokenResponse> {
    console.log('🔐 OAuth Token Request FULL BODY:', tokenRequest);
    console.log('🔐 OAuth Token Request:', {
      grant_type: tokenRequest.grant_type,
      client_id: tokenRequest.client_id,
      client_secret: tokenRequest.client_secret ? '***redacted***' : 'MISSING',
      scope: tokenRequest.scope
    });

    // Validate grant_type (Microsoft Entra requires client_credentials)
    if (tokenRequest.grant_type !== 'client_credentials') {
      throw new HttpException(
        {
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials grant type is supported'
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate client credentials
    if (!tokenRequest.client_id || !tokenRequest.client_secret) {
      throw new HttpException(
        {
          error: 'invalid_request',
          error_description: 'client_id and client_secret are required'
        },
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const token = await this.oauthService.generateAccessToken(
        tokenRequest.client_id,
        tokenRequest.client_secret,
        tokenRequest.scope
      );

      console.log('✅ OAuth Token Generated Successfully');

      return {
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: token.expiresIn,
        scope: token.scope
      };
    } catch (error) {
      console.error('❌ OAuth Token Generation Failed:', error instanceof Error ? error.message : String(error));
      
      throw new HttpException(
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }
}