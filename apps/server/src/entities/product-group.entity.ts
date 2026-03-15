import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ProductEntity } from './product.entity';

@Entity('product_groups')
export class ProductGroupEntity extends BaseEntity {
  @Column()
  name!: string;

  @OneToMany(() => ProductEntity, (product) => product.productGroup)
  products!: ProductEntity[];
}
