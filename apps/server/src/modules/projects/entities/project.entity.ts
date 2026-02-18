import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '@wms/types';
import { ProductEntity } from '../../products/entities/product.entity';
import { OutboundEntity } from '../../outbound/entities/outbound.entity';
import { PackingResultEntity } from '../../packing/entities/packing-result.entity';

@Entity('projects')
export class ProjectEntity extends BaseEntity implements Project {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => ProductEntity, (product) => product.project)
  products!: ProductEntity[];

  @OneToMany(() => OutboundEntity, (outbound) => outbound.project)
  outbounds!: OutboundEntity[];

  @OneToMany(() => PackingResultEntity, (packingResult) => packingResult.project)
  packingResults!: PackingResultEntity[];
}
