import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  async create(productGroupId: string, product: Partial<ProductEntity>): Promise<ProductEntity> {
    const entity = this.repository.create({ ...product, productGroupId });
    return await this.repository.save(entity);
  }

  async findAll(productGroupId: string): Promise<ProductEntity[]> {
    return await this.repository.find({
      where: { productGroupId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllGlobal(): Promise<ProductEntity[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProductEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findBySku(productGroupId: string, sku: string): Promise<ProductEntity[]> {
    return await this.repository.find({ where: { productGroupId, sku } });
  }

  async findBySkuGlobal(sku: string): Promise<ProductEntity[]> {
    return await this.repository.find({ where: { sku } });
  }

  async findByName(productGroupId: string, name: string): Promise<ProductEntity[]> {
    return await this.repository.find({ where: { productGroupId, name } });
  }

  async findByNameGlobal(name: string): Promise<ProductEntity[]> {
    return await this.repository.find({ where: { name } });
  }

  async update(id: string, product: Partial<ProductEntity>): Promise<ProductEntity> {
    await this.repository.update(id, product);
    const entity = await this.findOne(id);
    if (!entity) {
      throw new Error(`Product with ID "${id}" not found`);
    }
    return entity;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findWithSelect(productGroupId: string, select: string[]): Promise<ProductEntity[]> {
    return await this.repository.find({
      where: { productGroupId },
      select: select as any,
    });
  }

  async removeBulk(ids: string[]): Promise<number> {
    const result = await this.repository.delete({ id: In(ids) });
    return result.affected ?? 0;
  }

  @Transactional()
  async createBulk(
    productGroupId: string,
    products: Partial<ProductEntity>[],
  ): Promise<ProductEntity[]> {
    const entities = products.map((dto) => this.repository.create({ ...dto, productGroupId }));

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(ProductEntity)
      .values(entities)
      .orUpdate(['name', 'width', 'length', 'height'], ['productGroupId', 'sku'])
      .execute();

    return entities;
  }
}
