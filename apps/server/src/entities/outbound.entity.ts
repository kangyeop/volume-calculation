import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ProjectEntity } from './project.entity';
import { ProductEntity } from './product.entity';
import { OrderEntity } from './order.entity';

@Entity('outbounds')
@Index(['projectId', 'productId'])
@Index(['projectId', 'orderId'])
export class OutboundEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column({ name: 'orderCode' })
  orderCode!: string;

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

  @ManyToOne(() => OrderEntity, (order) => order.outbounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: OrderEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'productId' })
  product?: ProductEntity;
}
