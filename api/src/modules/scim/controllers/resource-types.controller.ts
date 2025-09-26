import { Controller, Get, Header } from '@nestjs/common';

@Controller('ResourceTypes')
export class ResourceTypesController {
  @Get()
  @Header('Content-Type', 'application/scim+json')
  getResourceTypes() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ListResponse'],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          id: 'User',
          name: 'User',
          endpoint: '/Users',
          description: 'User Account',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
          schemaExtensions: []
        },
        {
          id: 'Group',
          name: 'Group',
          endpoint: '/Groups',
          description: 'Group',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          schemaExtensions: []
        }
      ]
    };
  }
}
