import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { ProductEntity } from '../../products/entities/product.entity';

@Entity('outbounds')
@Index(['projectId', 'productId'])
export class OutboundEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column()
  sku!: string;

  @Column()
  quantity!: number;

  @Column({ nullable: true })
  recipientName!: string;

  @Column({ nullable: true })
  batchId!: string;

  @Column({ nullable: true })
  batchName!: string;

  @Column()
  projectId!: string;

  @Column({ nullable: true })
  productId!: string | null;

  @ManyToOne(() => ProjectEntity, (project) => project.outbounds)
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'productId' })
  product?: ProductEntity;
}
