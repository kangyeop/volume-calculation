import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ProductEntity } from '../entities/product.entity';
import { CreateProductDto } from '../dto/createProduct.dto';
import { UpdateProductDto } from '../dto/updateProduct.dto';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async create(productGroupId: string, createProductDto: CreateProductDto): Promise<ProductEntity> {
    return await this.productsRepository.create(productGroupId, createProductDto);
  }

  async findAll(productGroupId: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findAll(productGroupId);
  }

  async findAllForMatching(): Promise<ProductEntity[]> {
    return await this.productsRepository.findAllGlobal();
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

  async findBySku(productGroupId: string, sku: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findBySku(productGroupId, sku);
  }

  async findBySkuGlobal(sku: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findBySkuGlobal(sku);
  }

  async findByName(productGroupId: string, name: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findByName(productGroupId, name);
  }

  async findByNameGlobal(name: string): Promise<ProductEntity[]> {
    return await this.productsRepository.findByNameGlobal(name);
  }

  @Transactional()
  async createBulk(
    productGroupId: string,
    createProductDtos: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    return await this.productsRepository.createBulk(productGroupId, createProductDtos);
  }

  async removeBulk(ids: string[]): Promise<void> {
    await this.productsRepository.removeBulk(ids);
  }
}
