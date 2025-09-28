import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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

@Injectable()
export class OAuthService {
  // In production, store these securely (database, Azure Key Vault, etc.)
  private readonly validClients: Map<string, ClientCredentials> = new Map([
    ['scimtool-client', {
      clientId: 'scimtool-client',
      clientSecret: 'scimtool-secret-2025',
      scopes: ['scim.read', 'scim.write', 'scim.manage']
    }],
    // Add OAuth clients here if needed
    // ['your-client-id', {
    //   clientId: 'your-client-id',
    //   clientSecret: 'your-client-secret',
    //   scopes: ['scim.provision', 'scim.read', 'scim.write']
    // }]
  ]);

  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(
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

    return {
      accessToken,
      expiresIn,
      scope: grantedScopes.join(' ')
    };
  }

  async validateAccessToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      console.log('✅ Token Validation Success:', {
        clientId: payload.client_id,
        scope: payload.scope
      });
      return payload;
    } catch (error) {
      console.error('❌ Token Validation Failed:', error instanceof Error ? error.message : String(error));
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  hasScope(payload: any, requiredScope: string): boolean {
    const scopes = payload.scope ? payload.scope.split(' ') : [];
    return scopes.includes(requiredScope);
  }
}