import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BoxEntity } from '../entities/box.entity';
import { CreateBoxDto } from '../dto/createBox.dto';
import { UpdateBoxDto } from '../dto/updateBox.dto';
import { BoxesRepository } from '../repositories/boxes.repository';
import { ExcelService } from './excel.service';

const COLUMN_MAP: Record<string, string> = {
  '박스명': 'name',
  '가로': 'width',
  '세로': 'length',
  '높이': 'height',
  '가격': 'price',
};

@Injectable()
export class BoxesService {
  constructor(
    private readonly boxesRepository: BoxesRepository,
    private readonly excelService: ExcelService,
  ) {}

  async create(createBoxDto: CreateBoxDto): Promise<BoxEntity> {
    return await this.boxesRepository.create(createBoxDto);
  }

  async findAll(): Promise<BoxEntity[]> {
    return await this.boxesRepository.findAll();
  }

  async findOne(id: string): Promise<BoxEntity> {
    const box = await this.boxesRepository.findOne(id);
    if (!box) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
    return box;
  }

  async update(id: string, updateBoxDto: UpdateBoxDto): Promise<BoxEntity> {
    return await this.boxesRepository.update(id, updateBoxDto);
  }

  async findByGroupId(groupId: string): Promise<BoxEntity[]> {
    return await this.boxesRepository.findByGroupId(groupId);
  }

  async uploadBoxes(groupId: string, file: Express.Multer.File): Promise<{ imported: number }> {
    const { headers, rows } = this.excelService.parseExcelFile(file);

    const requiredColumns = ['박스명', '가로', '세로', '높이'];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missingColumns.join(', ')}`,
      );
    }

    const boxes: Partial<BoxEntity>[] = rows.map((row) => {
      const mapped: Record<string, unknown> = { boxGroupId: groupId };
      for (const [korean, english] of Object.entries(COLUMN_MAP)) {
        if (row[korean] !== undefined && row[korean] !== '') {
          mapped[english] =
            english === 'name' ? String(row[korean]) : parseFloat(String(row[korean]));
        }
      }
      return mapped as Partial<BoxEntity>;
    });

    const created = await this.boxesRepository.createBulk(boxes);
    return { imported: created.length };
  }

  async remove(id: string): Promise<void> {
    const removed = await this.boxesRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
  }
}
