import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ProjectEntity } from './project.entity';
import { OutboundEntity } from './outbound.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

@Entity('orders')
@Unique(['projectId', 'orderId'])
export class OrderEntity extends BaseEntity {
  @Column()
  orderId!: string;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column()
  projectId!: string;

  @OneToMany(() => OutboundEntity, (outbound) => outbound.order, {
    onDelete: 'CASCADE',
  })
  outbounds!: OutboundEntity[];

  @ManyToOne(() => ProjectEntity, (project) => project.orders)
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity;
}
