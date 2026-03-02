import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ProjectEntity } from './project.entity';

interface PlacementData {
  skuId: string;
  x: number;
  y: number;
  z: number;
  rotation: 'none' | '90' | '180' | '270';
}

@Entity('packing_results')
export class PackingResultEntity extends BaseEntity {
  @Column()
  boxId!: string;

  @Column()
  boxName!: string;

  @Column('int')
  packedCount!: number;

  @Column('int')
  remainingQuantity!: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
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

  @Column({ nullable: true })
  groupLabel!: string;

  @Column('uuid')
  projectId!: string;

  @Column({ type: 'json', nullable: true })
  placements!: PlacementData[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId!: string | null;

  @Column({ type: 'int', nullable: true })
  boxNumber!: number | null;

  @ManyToOne(() => ProjectEntity, (project) => project.packingResults)
  project!: ProjectEntity;
}
