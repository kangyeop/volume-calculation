import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
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

  async createBulk(
    projectId: string,
    createProductDtos: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const products = createProductDtos.map((dto) =>
        this.productsRepository.create({
          ...dto,
          projectId,
        }),
      );

      // Upsert: Conflict on (projectId, sku) should update fields
      // Use query builder for more control over conflict columns and updated columns
      await this.productsRepository
        .createQueryBuilder()
        .insert()
        .into(ProductEntity)
        .values(products)
        .orUpdate(
          ['name', 'width', 'length', 'height'],
          ['projectId', 'sku'],
        )
        .execute();

      await queryRunner.commitTransaction();

      // Return the input DTOs (not fully hydrated entities, but sufficient for bulk response)
      // Ideally we would fetch them back, but for performance we skip it.
      // We can map them to partial entities if needed.
      return products;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
