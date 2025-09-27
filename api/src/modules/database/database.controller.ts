import { Controller, Get, Query, Param } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('admin/database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('users')
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    return this.databaseService.getUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      active: active ? active === 'true' : undefined,
    });
  }

  @Get('groups')
  async getGroups(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
  ) {
    return this.databaseService.getGroups({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
    });
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    return this.databaseService.getUserDetails(id);
  }

  @Get('groups/:id')
  async getGroupDetails(@Param('id') id: string) {
    return this.databaseService.getGroupDetails(id);
  }

  @Get('statistics')
  async getStatistics() {
    return this.databaseService.getStatistics();
  }
}