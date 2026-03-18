import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OrderEntity } from './order.entity';
import { OutboundItemEntity } from './outbound-item.entity';
import { PackingResultEntity } from './packingResult.entity';

@Entity('outbound_batches')
export class OutboundBatchEntity extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'json', nullable: true })
  packingRecommendation!: any | null;

  @OneToMany(() => OrderEntity, (order) => order.outboundBatch)
  orders!: OrderEntity[];

  @OneToMany(() => OutboundItemEntity, (item) => item.outboundBatch)
  outboundItems!: OutboundItemEntity[];

  @OneToMany(() => PackingResultEntity, (result) => result.outboundBatch)
  packingResults!: PackingResultEntity[];
}
