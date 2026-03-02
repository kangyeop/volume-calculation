import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ProductEntity } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  async create(projectId: string, createProductDto: CreateProductDto): Promise<ProductEntity> {
    const product = this.productsRepository.create({
      ...createProductDto,
      projectId,
    });
    return await this.productsRepository.save(product);
  }

  async findAll(projectId: string): Promise<ProductEntity[]> {
    return await this.productsRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }

  async findBySku(projectId: string, sku: string): Promise<ProductEntity[]> {
    return await this.productsRepository.find({
      where: { projectId, sku },
    });
  }

  @Transactional()
  async createBulk(
    projectId: string,
    createProductDtos: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    const products = createProductDtos.map((dto) =>
      this.productsRepository.create({
        ...dto,
        projectId,
      }),
    );

    await this.productsRepository
      .createQueryBuilder()
      .insert()
      .into(ProductEntity)
      .values(products)
      .orUpdate(['name', 'width', 'length', 'height'], ['projectId', 'sku'])
      .execute();

    return products;
  }
}
