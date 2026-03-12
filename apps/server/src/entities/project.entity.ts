import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Project } from '@wms/types';
import { ProductEntity } from './product.entity';
import { OutboundEntity } from './outbound.entity';
import { OrderEntity } from './order.entity';
import { PackingResultEntity } from './packingResult.entity';

@Entity('projects')
export class ProjectEntity extends BaseEntity implements Project {
  @Column()
  name!: string;

  @OneToMany(() => ProductEntity, (product) => product.project)
  products!: ProductEntity[];

  @OneToMany(() => OutboundEntity, (outbound) => outbound.project)
  outbounds!: OutboundEntity[];

  @OneToMany(() => OrderEntity, (order) => order.project)
  orders!: OrderEntity[];

  @OneToMany(() => PackingResultEntity, (packingResult) => packingResult.project)
  packingResults!: PackingResultEntity[];
}
