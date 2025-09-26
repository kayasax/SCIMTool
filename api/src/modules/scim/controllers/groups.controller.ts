import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req
} from '@nestjs/common';
import type { Request } from 'express';

import { buildBaseUrl } from '../common/base-url.util';
import { SCIM_CORE_GROUP_SCHEMA } from '../common/scim-constants';
import type { ScimGroupResource } from '../common/scim-types';
import type { CreateGroupDto } from '../dto/create-group.dto';
import type { ListQueryDto } from '../dto/list-query.dto';
import type { PatchGroupDto } from '../dto/patch-group.dto';
import { ScimGroupsService } from '../services/scim-groups.service';

@Controller('Groups')
export class GroupsController {
  constructor(private readonly groupsService: ScimGroupsService) {}

  @Post()
  @Header('Content-Type', 'application/scim+json')
  async create(@Body() dto: CreateGroupDto, @Req() request: Request): Promise<ScimGroupResource> {
    const baseUrl = buildBaseUrl(request);
    const resource = await this.groupsService.createGroup(dto, baseUrl);
    return this.enforceSchema(resource);
  }

  @Get(':id')
  @Header('Content-Type', 'application/scim+json')
  async findOne(@Param('id') id: string, @Req() request: Request): Promise<ScimGroupResource> {
    const baseUrl = buildBaseUrl(request);
    const resource = await this.groupsService.getGroup(id, baseUrl);
    return this.enforceSchema(resource);
  }

  @Get()
  @Header('Content-Type', 'application/scim+json')
  async findAll(@Query() query: ListQueryDto, @Req() request: Request) {
    const baseUrl = buildBaseUrl(request);
    return this.groupsService.listGroups(query, baseUrl);
  }

  @Patch(':id')
  @HttpCode(204)
  async patch(@Param('id') id: string, @Body() dto: PatchGroupDto): Promise<void> {
    await this.groupsService.patchGroup(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.groupsService.deleteGroup(id);
  }

  private enforceSchema(resource: ScimGroupResource): ScimGroupResource {
    const schemas = new Set(resource.schemas ?? []);
    schemas.add(SCIM_CORE_GROUP_SCHEMA);
    return {
      ...resource,
      schemas: Array.from(schemas) as [string, ...string[]]
    };
  }
}
