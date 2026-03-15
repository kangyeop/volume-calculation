import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OutboundBatchEntity } from './outbound-batch.entity';
import { ProductEntity } from './product.entity';
import { OrderEntity } from './order.entity';

@Entity('outbound_items')
@Index(['outboundBatchId', 'productId'])
@Index(['outboundBatchId', 'orderId'])
export class OutboundItemEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column()
  sku!: string;

  @Column()
  quantity!: number;

  @Column('uuid')
  outboundBatchId!: string;

  @Column({ nullable: true })
  productId!: string | null;

  @ManyToOne(() => OutboundBatchEntity, (batch) => batch.outboundItems)
  @JoinColumn({ name: 'outboundBatchId' })
  outboundBatch!: OutboundBatchEntity;

  @ManyToOne(() => OrderEntity, (order) => order.outbounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: OrderEntity;

  @Column({ nullable: true })
  orderIdentifier?: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: ProductEntity;
}
