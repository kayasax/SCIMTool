import { Injectable } from '@nestjs/common';
import type { Prisma, ScimUser } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { createScimError } from '../common/scim-errors';
import {
  DEFAULT_COUNT,
  MAX_COUNT,
  SCIM_CORE_USER_SCHEMA,
  SCIM_LIST_RESPONSE_SCHEMA,
  SCIM_PATCH_SCHEMA
} from '../common/scim-constants';
import type { ScimListResponse, ScimUserResource } from '../common/scim-types';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { PatchUserDto } from '../dto/patch-user.dto';
import { ScimMetadataService } from './scim-metadata.service';

interface ListUsersParams {
  filter?: string;
  startIndex?: number;
  count?: number;
}

@Injectable()
export class ScimUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadata: ScimMetadataService
  ) {}

  async createUser(dto: CreateUserDto, baseUrl: string): Promise<ScimUserResource> {
    this.ensureSchema(dto.schemas, SCIM_CORE_USER_SCHEMA);

    const now = new Date();
    const scimId = randomUUID();
    const sanitizedPayload = this.extractAdditionalAttributes(dto);

    const data: Prisma.ScimUserCreateInput = {
      scimId,
      externalId: dto.externalId ?? null,
      userName: dto.userName,
      active: dto.active ?? true,
      rawPayload: JSON.stringify(sanitizedPayload),
      meta: JSON.stringify({
        resourceType: 'User',
        created: now.toISOString(),
        lastModified: now.toISOString()
      })
    };

    const created = await this.prisma.scimUser.create({ data });

    return this.toScimUserResource(created, baseUrl);
  }

  async getUser(scimId: string, baseUrl: string): Promise<ScimUserResource> {
    const user = await this.prisma.scimUser.findUnique({ where: { scimId } });
    if (!user) {
      throw createScimError({ status: 404, detail: `Resource ${scimId} not found.` });
    }

    return this.toScimUserResource(user, baseUrl);
  }

  async deleteUser(scimId: string): Promise<void> {
    try {
      await this.prisma.scimUser.delete({ where: { scimId } });
    } catch (error) {
      throw createScimError({ status: 404, detail: `Resource ${scimId} not found.` });
    }
  }

  async listUsers(
    { filter, startIndex = 1, count = DEFAULT_COUNT }: ListUsersParams,
    baseUrl: string
  ): Promise<ScimListResponse<ScimUserResource>> {
    if (count > MAX_COUNT) {
      count = MAX_COUNT;
    }

    const where = this.buildFilter(filter);

    const [totalResults, users] = await Promise.all([
      this.prisma.scimUser.count({ where }),
      this.prisma.scimUser.findMany({
        where,
        skip: Math.max(startIndex - 1, 0),
        take: Math.max(Math.min(count, MAX_COUNT), 0),
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const resources = users.map((user) => this.toScimUserResource(user, baseUrl));

    return {
      schemas: [SCIM_LIST_RESPONSE_SCHEMA],
      totalResults,
      startIndex,
      itemsPerPage: resources.length,
      Resources: resources
    };
  }

  async patchUser(
    scimId: string,
    patchDto: PatchUserDto,
    baseUrl: string
  ): Promise<ScimUserResource> {
    this.ensureSchema(patchDto.schemas, SCIM_PATCH_SCHEMA);

    const user = await this.prisma.scimUser.findUnique({ where: { scimId } });
    if (!user) {
      throw createScimError({ status: 404, detail: `Resource ${scimId} not found.` });
    }

    const updatedData = this.applyPatchOperations(user, patchDto);

    const updatedUser = await this.prisma.scimUser.update({
      where: { scimId },
      data: updatedData
    });

    return this.toScimUserResource(updatedUser, baseUrl);
  }

  async replaceUser(
    scimId: string,
    dto: CreateUserDto,
    baseUrl: string
  ): Promise<ScimUserResource> {
    this.ensureSchema(dto.schemas, SCIM_CORE_USER_SCHEMA);

    const user = await this.prisma.scimUser.findUnique({ where: { scimId } });
    if (!user) {
      throw createScimError({ status: 404, detail: `Resource ${scimId} not found.` });
    }

    const now = new Date();
    const sanitizedPayload = this.extractAdditionalAttributes(dto);
    const meta = this.parseJson<Record<string, unknown>>(String(user.meta ?? '{}'));

    const data: Prisma.ScimUserUpdateInput = {
      externalId: dto.externalId ?? null,
      userName: dto.userName,
      active: dto.active ?? true,
      rawPayload: JSON.stringify(sanitizedPayload),
      meta: JSON.stringify({
        ...meta,
        lastModified: now.toISOString()
      })
    };

    const updatedUser = await this.prisma.scimUser.update({
      where: { scimId },
      data
    });

    return this.toScimUserResource(updatedUser, baseUrl);
  }

  private ensureSchema(schemas: string[] | undefined, requiredSchema: string): void {
    if (!schemas || !schemas.includes(requiredSchema)) {
      throw createScimError({
        status: 400,
        detail: `Missing required schema '${requiredSchema}'.`
      });
    }
  }

  private buildFilter(filter?: string): Prisma.ScimUserWhereInput {
    if (!filter) {
      return {};
    }

    // Support simple filters: attribute eq "value"
    const regex = /(\w+(?:\.\w+)*)\s+eq\s+"?([^"]+)"?/i;
    const match = filter.match(regex);
    if (!match) {
      throw createScimError({
        status: 400,
        detail: `Unsupported filter expression: '${filter}'.`
      });
    }

    const attribute = match[1];
    const value = match[2];

    switch (attribute) {
      case 'userName':
        return { userName: value };
      case 'externalId':
        return { externalId: value };
      case 'id':
        return { scimId: value };
      default:
        throw createScimError({
          status: 400,
          detail: `Filtering by attribute '${attribute}' is not supported.`
        });
    }
  }

  private applyPatchOperations(
    user: ScimUser,
    patchDto: PatchUserDto
  ): Prisma.ScimUserUpdateInput {
  let active = user.active;
  let rawPayload = this.parseJson<Record<string, unknown>>(String(user.rawPayload ?? '{}'));

    for (const operation of patchDto.Operations) {
      const op = operation.op?.toLowerCase();
      if (!['add', 'replace', 'remove'].includes(op || '')) {
        throw createScimError({
          status: 400,
          detail: `Patch operation '${operation.op}' is not supported.`
        });
      }

      const path = operation.path?.toLowerCase();

      // Handle different operations
      if (op === 'add' || op === 'replace') {
        if (path === 'active') {
          const value = this.extractBooleanValue(operation.value);
          active = value;
          rawPayload = {
            ...rawPayload,
            active: value
          };
        } else if (path && operation.value !== undefined) {
          // For other attributes, store in rawPayload
          rawPayload = {
            ...rawPayload,
            [path]: operation.value
          };
        } else if (!path && typeof operation.value === 'object' && operation.value !== null) {
          // No path specified - update the entire resource (common for add operations)
          const updateObj = operation.value as Record<string, unknown>;
          if ('active' in updateObj) {
            active = this.extractBooleanValue(updateObj.active);
          }
          rawPayload = {
            ...rawPayload,
            ...updateObj
          };
        } else {
          throw createScimError({
            status: 400,
            detail: `Patch path '${operation.path ?? ''}' is not supported.`
          });
        }
      } else if (op === 'remove') {
        if (path === 'active') {
          // Cannot remove active attribute, set to false instead
          active = false;
          rawPayload = {
            ...rawPayload,
            active: false
          };
        } else if (path) {
          // Remove attribute from rawPayload
          const { [path]: removed, ...remaining } = rawPayload;
          rawPayload = remaining;
        } else {
          throw createScimError({
            status: 400,
            detail: `Remove operation requires a path.`
          });
        }
      }
    }

    return {
      active,
      rawPayload: JSON.stringify(rawPayload),
      meta: JSON.stringify({
  ...this.parseJson<Record<string, unknown>>(String(user.meta ?? '{}')),
        lastModified: new Date().toISOString()
      })
    } satisfies Prisma.ScimUserUpdateInput;
  }

  private extractBooleanValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle string boolean values from Entra ID
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
    }

    if (typeof value === 'object' && value !== null && 'active' in value) {
      const active = (value as { active: unknown }).active;
      if (typeof active === 'boolean') {
        return active;
      }
      // Also handle string boolean in nested objects
      if (typeof active === 'string') {
        const lowerActive = active.toLowerCase();
        if (lowerActive === 'true') return true;
        if (lowerActive === 'false') return false;
      }
    }

    throw createScimError({
      status: 400,
      detail: `Patch operation requires boolean value for active. Received: ${typeof value} "${value}"`
    });
  }

  private toScimUserResource(user: ScimUser, baseUrl: string): ScimUserResource {
  const meta = this.buildMeta(user, baseUrl);
  const rawPayload = this.parseJson<Record<string, unknown>>(String(user.rawPayload ?? '{}'));

    return {
      schemas: [SCIM_CORE_USER_SCHEMA],
      id: user.scimId,
      userName: user.userName,
      externalId: user.externalId ?? undefined,
      active: user.active,
      ...rawPayload,
      meta
    };
  }

  private buildMeta(user: ScimUser, baseUrl: string) {
    const createdAt = user.createdAt.toISOString();
    const lastModified = user.updatedAt.toISOString();
  const location = this.metadata.buildLocation(baseUrl, 'Users', String(user.scimId));

    return {
      resourceType: 'User',
      created: createdAt,
      lastModified,
      location,
  version: `W/"${user.updatedAt.toISOString()}"`
    };
  }

  private extractAdditionalAttributes(dto: CreateUserDto): Record<string, unknown> {
    const { schemas, ...rest } = dto;
    const additional = { ...rest } as Record<string, unknown>;
    delete additional.userName;
    delete additional.externalId;
    delete additional.active;

    return {
      schemas,
      ...additional
    };
  }

  private parseJson<T>(value: string | null | undefined): T {
    if (!value) {
      return {} as T;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return {} as T;
    }
  }
}
