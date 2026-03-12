import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/createProduct.dto';
import { UpdateProductDto } from '../dto/updateProduct.dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('projects/:projectId/products')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(projectId, createProductDto);
  }

  @Get('projects/:projectId/products')
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.productsService.findAll(projectId);
  }

  @Post('projects/:projectId/products/bulk')
  createBulk(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createProductDtos: CreateProductDto[],
  ) {
    return this.productsService.createBulk(projectId, createProductDtos);
  }

  @Patch('products/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('products/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  @Delete('projects/:projectId/products')
  removeBulk(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.productsService.removeBulk(body.ids);
  }
}
