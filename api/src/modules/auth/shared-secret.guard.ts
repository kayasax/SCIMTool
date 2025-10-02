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
import * as crypto from 'crypto';
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

    // Retrieve shared secret from configuration/env.
    // If it's missing in production we fail fast (never prompt).
    // In non-production (dev/test) we auto-generate a secure ephemeral secret once per process
    // to avoid the app "asking" the operator to configure it manually.
    let expectedSecret = this.configService.get<string>('SCIM_SHARED_SECRET');

    if (!expectedSecret) {
      if (process.env.NODE_ENV === 'production') {
        // Fail fast with clear message – operator must configure the secret explicitly.
        // Using 401 path gives consistent SCIM error formatting.
        console.error('[SCIM] SCIM_SHARED_SECRET is not configured. Set the environment variable or secret in your deployment.');
        this.reject(response, 'SCIM shared secret not configured.');
      } else {
        // Dev / test convenience: generate once and memoize in env so subsequent guard calls reuse it.
        const generated = crypto.randomBytes(32).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/g, '');
        process.env.SCIM_SHARED_SECRET = generated;
        expectedSecret = generated;
        // eslint-disable-next-line no-console
        console.warn(`[SCIM] Auto-generated ephemeral SCIM_SHARED_SECRET for ${process.env.NODE_ENV || 'development'}: ${generated}`);
      }
    }

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
