import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/createProduct.dto';
import { UpdateProductDto } from '../dto/updateProduct.dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('product-groups/:groupId/products')
  create(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(groupId, createProductDto);
  }

  @Get('product-groups/:groupId/products')
  findAll(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.productsService.findAll(groupId);
  }

  @Post('product-groups/:groupId/products/bulk')
  createBulk(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() createProductDtos: CreateProductDto[],
  ) {
    return this.productsService.createBulk(groupId, createProductDtos);
  }

  @Patch('products/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('products/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  @Delete('product-groups/:groupId/products')
  removeBulk(@Param('groupId', ParseUUIDPipe) _groupId: string, @Body() body: { ids: string[] }) {
    return this.productsService.removeBulk(body.ids);
  }
}
