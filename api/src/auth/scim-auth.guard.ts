import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OAuthService } from '../oauth/oauth.service';

@Injectable()
export class ScimAuthGuard implements CanActivate {
  // Legacy bearer token for backward compatibility
  private readonly legacyBearerToken = 'S@g@r!2011';

  constructor(private readonly oauthService: OAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    try {
      // First, try OAuth JWT token validation
      if (token !== this.legacyBearerToken) {
        console.log('🔍 Attempting OAuth token validation...');
        const payload = await this.oauthService.validateAccessToken(token);
        
        // Add token payload to request for later use
        request.oauth = payload;
        request.authType = 'oauth';
        
        console.log('✅ OAuth authentication successful:', payload.client_id);
        return true;
      }
      
      // Fall back to legacy bearer token for backward compatibility
      console.log('🔍 Using legacy bearer token authentication...');
      request.authType = 'legacy';
      console.log('✅ Legacy authentication successful');
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Authentication failed:', errorMessage);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}