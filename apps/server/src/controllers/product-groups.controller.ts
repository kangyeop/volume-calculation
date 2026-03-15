import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ProductGroupsService } from '../services/product-groups.service';

@Controller('product-groups')
export class ProductGroupsController {
  constructor(private readonly productGroupsService: ProductGroupsService) {}

  @Get()
  findAll() {
    return this.productGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productGroupsService.findOne(id);
  }

  @Post()
  create(@Body('name') name: string) {
    return this.productGroupsService.create(name);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productGroupsService.delete(id);
  }
}
