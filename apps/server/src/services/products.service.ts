import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ProductEntity } from '../entities/product.entity';
import { CreateProductDto } from '../dto/createProduct.dto';
import { UpdateProductDto } from '../dto/updateProduct.dto';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async create(projectId: string, createProductDto: CreateProductDto): Promise<ProductEntity> {
    return await this.productsRepository.create(projectId, createProductDto);
  }

  async findAll(projectId: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findAll(projectId);
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductEntity> {
    return await this.productsRepository.update(id, updateProductDto);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.productsRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }

  async findBySku(projectId: string, sku: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findBySku(projectId, sku);
  }

  @Transactional()
  async createBulk(
    projectId: string,
    createProductDtos: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    return await this.productsRepository.createBulk(projectId, createProductDtos);
  }
}
