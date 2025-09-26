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
import { SCIM_CORE_USER_SCHEMA } from '../common/scim-constants';
import type { ScimUserResource } from '../common/scim-types';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { ListQueryDto } from '../dto/list-query.dto';
import type { PatchUserDto } from '../dto/patch-user.dto';
import { ScimUsersService } from '../services/scim-users.service';

@Controller('Users')
export class UsersController {
  constructor(private readonly usersService: ScimUsersService) {}

  @Post()
  @Header('Content-Type', 'application/scim+json')
  async create(@Body() dto: CreateUserDto, @Req() request: Request): Promise<ScimUserResource> {
    const baseUrl = buildBaseUrl(request);
    const resource = await this.usersService.createUser(dto, baseUrl);
    return this.enforceSchema(resource);
  }

  @Get(':id')
  @Header('Content-Type', 'application/scim+json')
  async findOne(@Param('id') id: string, @Req() request: Request): Promise<ScimUserResource> {
    const baseUrl = buildBaseUrl(request);
    const resource = await this.usersService.getUser(id, baseUrl);
    return this.enforceSchema(resource);
  }

  @Get()
  @Header('Content-Type', 'application/scim+json')
  async findAll(@Query() query: ListQueryDto, @Req() request: Request) {
    const baseUrl = buildBaseUrl(request);
    const response = await this.usersService.listUsers(query, baseUrl);
    return response;
  }

  @Patch(':id')
  @Header('Content-Type', 'application/scim+json')
  async patch(
    @Param('id') id: string,
    @Body() dto: PatchUserDto,
    @Req() request: Request
  ): Promise<ScimUserResource> {
    const baseUrl = buildBaseUrl(request);
    const resource = await this.usersService.patchUser(id, dto, baseUrl);
    return this.enforceSchema(resource);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.deleteUser(id);
  }

  private enforceSchema(resource: ScimUserResource): ScimUserResource {
    const schemas = new Set(resource.schemas ?? []);
    schemas.add(SCIM_CORE_USER_SCHEMA);
    return {
      ...resource,
      schemas: Array.from(schemas) as [string, ...string[]]
    };
  }
}
