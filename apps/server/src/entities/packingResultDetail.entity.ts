import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('packing_result_details')
export class PackingResultDetailEntity extends BaseEntity {
  @Column()
  projectId!: string;

  @Column({ nullable: true })
  batchId!: string;

  @Column()
  batchName!: string;

  @Column()
  orderId!: string;

  @Column({ nullable: true })
  recipientName!: string;

  @Column()
  sku!: string;

  @Column({ nullable: true })
  productName!: string;

  @Column('int')
  quantity!: number;

  @Column()
  boxName!: string;

  @Column('int')
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
    scale: 2,
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
}
