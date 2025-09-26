import { Controller, Get, Header } from '@nestjs/common';

import { SCIM_SP_CONFIG_SCHEMA } from '../common/scim-constants';

@Controller('ServiceProviderConfig')
export class ServiceProviderConfigController {
  @Get()
  @Header('Content-Type', 'application/scim+json')
  getConfig() {
    return {
      schemas: [SCIM_SP_CONFIG_SCHEMA],
      patch: { supported: true },
      bulk: { supported: false },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: true },
      etag: { supported: true },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication scheme using the OAuth Bearer Token Standard',
          specificationUrl: 'https://www.rfc-editor.org/info/rfc6750'
        }
      ]
    };
  }
}
