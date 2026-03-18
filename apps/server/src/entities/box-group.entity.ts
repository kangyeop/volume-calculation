import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { BoxEntity } from './box.entity';

@Entity('box_groups')
export class BoxGroupEntity extends BaseEntity {
  @Column()
  name!: string;

  @OneToMany(() => BoxEntity, (box) => box.boxGroup)
  boxes!: BoxEntity[];
}
