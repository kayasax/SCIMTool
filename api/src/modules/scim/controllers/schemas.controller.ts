import { Controller, Get, Header } from '@nestjs/common';

@Controller('Schemas')
export class SchemasController {
  @Get()
  @Header('Content-Type', 'application/scim+json')
  getSchemas() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ListResponse'],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [this.userSchema(), this.groupSchema()]
    };
  }

  private userSchema() {
    return {
      id: 'urn:ietf:params:scim:schemas:core:2.0:User',
      name: 'User',
      description: 'User Account',
      attributes: [
        {
          name: 'userName',
          type: 'string',
          multiValued: false,
          required: true,
          caseExact: false,
          mutability: 'readWrite',
          returned: 'always',
          uniqueness: 'server'
        },
        {
          name: 'displayName',
          type: 'string',
          multiValued: false,
          required: false,
          caseExact: false,
          mutability: 'readWrite',
          returned: 'default'
        },
        {
          name: 'active',
          type: 'boolean',
          multiValued: false,
          required: false,
          caseExact: false,
          mutability: 'readWrite',
          returned: 'default'
        },
        {
          name: 'emails',
          type: 'complex',
          multiValued: true,
          required: false,
          subAttributes: [
            {
              name: 'value',
              type: 'string',
              multiValued: false,
              required: true,
              caseExact: false,
              mutability: 'readWrite',
              returned: 'always'
            },
            {
              name: 'type',
              type: 'string',
              multiValued: false,
              required: false,
              caseExact: false,
              mutability: 'readWrite',
              returned: 'default'
            },
            {
              name: 'primary',
              type: 'boolean',
              multiValued: false,
              required: false,
              caseExact: false,
              mutability: 'readWrite',
              returned: 'default'
            }
          ],
          mutability: 'readWrite',
          returned: 'default'
        }
      ]
    };
  }

  private groupSchema() {
    return {
      id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      name: 'Group',
      description: 'Group',
      attributes: [
        {
          name: 'displayName',
          type: 'string',
          multiValued: false,
          required: true,
          mutability: 'readWrite',
          returned: 'always'
        },
        {
          name: 'members',
          type: 'complex',
          multiValued: true,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
          subAttributes: [
            {
              name: 'value',
              type: 'string',
              multiValued: false,
              required: true,
              mutability: 'immutable',
              returned: 'always'
            },
            {
              name: 'display',
              type: 'string',
              multiValued: false,
              required: false,
              mutability: 'immutable',
              returned: 'default'
            },
            {
              name: 'type',
              type: 'string',
              multiValued: false,
              required: false,
              mutability: 'immutable',
              returned: 'default'
            }
          ]
        }
      ]
    };
  }
}
