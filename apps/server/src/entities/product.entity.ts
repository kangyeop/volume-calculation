import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ProductGroupEntity } from './product-group.entity';

@Entity('products')
@Unique(['productGroup', 'sku'])
export class ProductEntity extends BaseEntity {
  @Column()
  sku!: string;

  @Column()
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  width!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  length!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  height!: number;

  @Column('uuid')
  productGroupId!: string;

  @ManyToOne(() => ProductGroupEntity, (group) => group.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productGroupId' })
  productGroup!: ProductGroupEntity;
}
