import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OutboundBatchEntity } from './outbound-batch.entity';

@Entity('packing_result_details')
export class PackingResultDetailEntity extends BaseEntity {
  @Column('uuid')
  outboundBatchId!: string;

  @Column()
  orderId!: string;

  @Column({ nullable: true })
  recipientName!: string;

  @Column()
  sku!: string;

  @Column()
  productName!: string;

  @Column()
  quantity!: number;

  @Column()
  boxName!: string;

  @Column()
  boxNumber!: number;

  @Column('int')
  boxIndex!: number;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  boxCBM!: number;

  @Column('decimal', {
    precision: 10,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  efficiency!: number;

  @Column({ nullable: true })
  unpacked!: boolean;

  @Column({ nullable: true })
  unpackedReason!: string;

  @Column({ type: 'json', nullable: true })
  placements!: any[] | null;

  @ManyToOne(() => OutboundBatchEntity, (batch) => batch.packingResults)
  @JoinColumn({ name: 'outboundBatchId' })
  outboundBatch!: OutboundBatchEntity;
}
