import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OutboundBatchEntity } from './outbound-batch.entity';
import { OutboundItemEntity } from './outbound-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

@Entity('orders')
@Unique(['outboundBatchId', 'orderId'])
export class OrderEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ nullable: true })
  address?: string;

  @Column()
  quantity!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column('uuid')
  outboundBatchId!: string;

  @OneToMany(() => OutboundItemEntity, (outbound) => outbound.order, {
    onDelete: 'CASCADE',
  })
  outbounds!: OutboundItemEntity[];

  @ManyToOne(() => OutboundBatchEntity, (batch) => batch.orders)
  @JoinColumn({ name: 'outboundBatchId' })
  outboundBatch!: OutboundBatchEntity;
}
