import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Project } from '@wms/types';
import { OutboundEntity } from './outbound.entity';

@Entity('projects')
export class ProjectEntity extends BaseEntity implements Project {
  @Column()
  name!: string;

  @OneToMany(() => OutboundEntity, (outbound) => outbound.project)
  outbounds!: OutboundEntity[];
}
