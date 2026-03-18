import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { BoxGroupsService } from '../services/box-groups.service';

@Controller('box-groups')
export class BoxGroupsController {
  constructor(private readonly boxGroupsService: BoxGroupsService) {}

  @Get()
  findAll() {
    return this.boxGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.boxGroupsService.findOne(id);
  }

  @Post()
  create(@Body('name') name: string) {
    return this.boxGroupsService.create(name);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.boxGroupsService.delete(id);
  }
}
