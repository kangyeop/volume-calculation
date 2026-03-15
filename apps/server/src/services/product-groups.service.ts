import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductGroupEntity } from '../entities/product-group.entity';

@Injectable()
export class ProductGroupsService {
  constructor(
    @InjectRepository(ProductGroupEntity)
    private productGroupRepository: Repository<ProductGroupEntity>,
  ) {}

  async findAll(): Promise<ProductGroupEntity[]> {
    return this.productGroupRepository.find({ relations: ['products'] });
  }

  async findOne(id: string): Promise<ProductGroupEntity> {
    const group = await this.productGroupRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!group) throw new NotFoundException(`ProductGroup ${id} not found`);
    return group;
  }

  async create(name: string): Promise<ProductGroupEntity> {
    const group = this.productGroupRepository.create({ name });
    return this.productGroupRepository.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.productGroupRepository.remove(group);
  }
}
