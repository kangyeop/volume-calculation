import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Box } from '@wms/types';
import { BoxGroupEntity } from './box-group.entity';

@Entity('boxes')
export class BoxEntity extends BaseEntity implements Box {
  @Column()
  name!: string;

  @Column({ nullable: true })
  boxGroupId!: string;

  @ManyToOne(() => BoxGroupEntity, (group) => group.boxes, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'boxGroupId' })
  boxGroup!: BoxGroupEntity;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  width!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  length!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  height!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price!: number;
}
