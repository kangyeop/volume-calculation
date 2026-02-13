import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxEntity } from './entities/box.entity';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';

@Injectable()
export class BoxesService {
  constructor(
    @InjectRepository(BoxEntity)
    private readonly boxesRepository: Repository<BoxEntity>,
  ) {}

  async create(createBoxDto: CreateBoxDto): Promise<BoxEntity> {
    const box = this.boxesRepository.create(createBoxDto);
    return await this.boxesRepository.save(box);
  }

  async findAll(): Promise<BoxEntity[]> {
    return await this.boxesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BoxEntity> {
    const box = await this.boxesRepository.findOne({
      where: { id },
    });
    if (!box) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
    return box;
  }

  async update(id: string, updateBoxDto: UpdateBoxDto): Promise<BoxEntity> {
    const box = await this.findOne(id);
    Object.assign(box, updateBoxDto);
    return await this.boxesRepository.save(box);
  }

  async remove(id: string): Promise<void> {
    const result = await this.boxesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
  }
}
