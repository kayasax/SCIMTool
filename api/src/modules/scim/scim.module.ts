import { Module } from '@nestjs/common';

import { LoggingModule } from '../logging/logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './controllers/admin.controller';
import { GroupsController } from './controllers/groups.controller';
import { ResourceTypesController } from './controllers/resource-types.controller';
import { SchemasController } from './controllers/schemas.controller';
import { ServiceProviderConfigController } from './controllers/service-provider-config.controller';
import { UsersController } from './controllers/users.controller';
import { ScimGroupsService } from './services/scim-groups.service';
import { ScimMetadataService } from './services/scim-metadata.service';
import { ScimUsersService } from './services/scim-users.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [
    ServiceProviderConfigController,
    ResourceTypesController,
    SchemasController,
    UsersController,
    GroupsController,
    AdminController
  ],
  providers: [ScimUsersService, ScimGroupsService, ScimMetadataService]
})
export class ScimModule {}
