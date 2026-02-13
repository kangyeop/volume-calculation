import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

@Entity('packing_results')
export class PackingResultEntity extends BaseEntity {
  @Column()
  boxId: string;

  @Column()
  boxName: string;

  @Column('int')
  packedCount: number;

  @Column('int')
  remainingQuantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  efficiency: number;

  @Column('decimal', { precision: 10, scale: 4 })
  totalCBM: number;

  @Column({ nullable: true })
  groupLabel: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.packingResults)
  project: ProjectEntity;
}
