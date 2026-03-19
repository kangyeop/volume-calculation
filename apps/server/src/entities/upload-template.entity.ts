import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('upload_templates')
export class UploadTemplateEntity extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ['outbound', 'product'] })
  type!: 'outbound' | 'product';

  @Column({ type: 'json' })
  headers!: string[];

  @Column({ type: 'json' })
  columnMapping!: Record<string, string>;

  @Column({ default: 'single' })
  rowStructure!: string;

  @Column({ type: 'varchar', nullable: true })
  compoundPattern!: string | null;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt!: Date | null;
}
