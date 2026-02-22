import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

@Entity('outbounds')
export class OutboundEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column()
  sku!: string;

  @Column()
  quantity!: number;

  @Column({ nullable: true })
  recipientName!: string;

  @Column({ nullable: true })
  batchId!: string;

  @Column({ nullable: true })
  batchName!: string;

  @Column()
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.outbounds)
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity;
}
