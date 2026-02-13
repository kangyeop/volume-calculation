import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('products/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
