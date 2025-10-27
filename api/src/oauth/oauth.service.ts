import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AccessToken {
  accessToken: string;
  expiresIn: number;
  scope?: string;
}

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

interface TokenPayload {
  sub: string;
  client_id: string;
  scope?: string;
  token_type: string;
  [key: string]: unknown;
}

@Injectable()
export class OAuthService {
  private readonly validClients: Map<string, ClientCredentials>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {
    const defaultClientId = this.config.get<string>('OAUTH_CLIENT_ID') || 'scimtool-client';
    const configuredSecret = this.config.get<string>('OAUTH_CLIENT_SECRET');
    const configuredScopes = this.config.get<string>('OAUTH_CLIENT_SCOPES');

    let clientSecret = configuredSecret;

    if (!clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('OAUTH_CLIENT_SECRET is required in production to secure OAuth access.');
      }

      clientSecret = crypto.randomBytes(32).toString('hex');
      // eslint-disable-next-line no-console
      console.warn(`[OAuth] Auto-generated development client secret for "${defaultClientId}". Configure OAUTH_CLIENT_SECRET for production.`);
    }

    const scopes = configuredScopes
      ? configuredScopes.split(',').map(scope => scope.trim()).filter(Boolean)
      : ['scim.read', 'scim.write', 'scim.manage'];

    this.validClients = new Map([
      [defaultClientId, {
        clientId: defaultClientId,
        clientSecret,
        scopes,
      }],
    ]);
  }

  generateAccessToken(
    clientId: string,
    clientSecret: string,
    requestedScope?: string
  ): Promise<AccessToken> {
    console.log('🔍 OAuth Service - Validating client:', {
      clientId,
      clientSecret: clientSecret ? '***redacted***' : 'MISSING',
      availableClients: Array.from(this.validClients.keys())
    });

    // Validate client credentials
    const client = this.validClients.get(clientId);
    console.log('🔍 Found client:', client ? 'YES' : 'NO');

    if (!client || client.clientSecret !== clientSecret) {
      console.log('❌ Client validation failed:', {
        clientFound: !!client,
        secretMatch: client ? client.clientSecret === clientSecret : false
      });
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Validate and filter scopes
    const requestedScopes = requestedScope ? requestedScope.split(' ') : [];
    const allowedScopes = requestedScopes.filter(scope =>
      client.scopes.includes(scope)
    );

    // If no specific scopes requested, grant all client scopes
    const grantedScopes = allowedScopes.length > 0 ? allowedScopes : client.scopes;

    // Token payload
    const payload = {
      sub: clientId,
      client_id: clientId,
      scope: grantedScopes.join(' '),
      token_type: 'access_token'
    };

    // Generate JWT token (expires in 1 hour)
    const expiresIn = 3600; // 1 hour in seconds
    const accessToken = this.jwtService.sign(payload, { expiresIn: `${expiresIn}s` });

    console.log('🎫 Generated Access Token:', {
      clientId,
      scopes: grantedScopes,
      expiresIn: `${expiresIn}s`
    });

    return Promise.resolve({
      accessToken,
      expiresIn,
      scope: grantedScopes.join(' ')
    });
  }

  validateAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);
      console.log('✅ Token Validation Success:', {
        clientId: payload.client_id,
        scope: payload.scope
      });
      return Promise.resolve(payload);
    } catch (error) {
      console.error('❌ Token Validation Failed:', error instanceof Error ? error.message : String(error));
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  hasScope(payload: TokenPayload, requiredScope: string): boolean {
    const scopes = payload.scope ? payload.scope.split(' ') : [];
    return scopes.includes(requiredScope);
  }
}