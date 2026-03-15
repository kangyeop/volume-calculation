import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OutboundBatchEntity } from './outbound-batch.entity';

@Entity('packing_results')
export class PackingResultEntity extends BaseEntity {
  @Column({ nullable: true })
  boxId!: string;

  @Column({ nullable: true })
  boxName!: string;

  @Column('int')
  packedCount!: number;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  efficiency!: number;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalCBM!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  groupLabel!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId!: string;

  @Column({ type: 'int', nullable: true })
  boxNumber!: number;

  @Column('uuid')
  outboundBatchId!: string;

  @ManyToOne(() => OutboundBatchEntity, (batch) => batch.packingResults)
  @JoinColumn({ name: 'outboundBatchId' })
  outboundBatch!: OutboundBatchEntity;
}
