import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { Product } from '@wms/types';

@Entity('products')
@Unique(['project', 'sku'])
export class ProductEntity extends BaseEntity implements Product {
  @Column()
  sku!: string;

  @Column()
  name!: string;

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
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  weight!: number;

  @Column()
  projectId!: string;

  @Column({ type: 'date', nullable: true })
  inboundDate!: Date;

  @Column({ type: 'date', nullable: true })
  outboundDate!: Date;

  @Column({ default: false })
  barcode!: boolean;

  @Column({ default: false })
  aircap!: boolean;

  @Column({ type: 'text', nullable: true })
  remarks!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity;
}
