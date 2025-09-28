import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { SCIM_ERROR_SCHEMA } from '../scim/common/scim-constants';
import { OAuthService } from '../../oauth/oauth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AuthenticatedRequest extends Request {
  oauth?: Record<string, unknown>;
  authType?: 'oauth' | 'legacy';
}

@Injectable()
export class SharedSecretGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject(OAuthService) private readonly oauthService: OAuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();
    const response = httpContext.getResponse<Response>();

    const header = request.headers.authorization;
    const expectedSecret = this.configService.get<string>('SCIM_SHARED_SECRET') || 'S@g@r!2011';

    if (!header || !header.startsWith('Bearer ')) {
      this.reject(response, 'Missing bearer token.');
    }

    const token = header?.slice(7) ?? '';

    // First, try OAuth 2.0 JWT token validation
    if (token !== expectedSecret) {
      try {
        console.log('🔍 Attempting OAuth 2.0 token validation...');
        const payload = await this.oauthService.validateAccessToken(token);

        // Add OAuth payload to request for later use
        request.oauth = payload;
        request.authType = 'oauth';

        console.log('✅ OAuth 2.0 authentication successful:', payload.client_id);
        return true;
      } catch (oauthError) {
        console.log('❌ OAuth 2.0 validation failed, checking legacy token...');
        // Fall through to legacy token check
      }
    }

    // Fall back to legacy bearer token validation
    if (token === expectedSecret) {
      console.log('✅ Legacy bearer token authentication successful');
      request.authType = 'legacy';
      return true;
    }

    // Both OAuth and legacy validation failed
    this.reject(response, 'Invalid bearer token.');
  }

  private reject(response: Response, detail: string): never {
    response.setHeader('WWW-Authenticate', 'Bearer realm="SCIM"');
    throw new UnauthorizedException({
      schemas: [SCIM_ERROR_SCHEMA],
      detail,
      status: 401,
      scimType: 'invalidToken'
    });
  }
}
