import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoxesService } from '../services/boxes.service';
import { CreateBoxDto } from '../dto/createBox.dto';
import { UpdateBoxDto } from '../dto/updateBox.dto';

@Controller('boxes')
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('groupId') groupId: string,
  ): Promise<{ success: boolean; data: { imported: number } }> {
    if (!file) throw new BadRequestException('File is required');
    if (!groupId) throw new BadRequestException('groupId is required');

    const result = await this.boxesService.uploadBoxes(groupId, file);
    return { success: true, data: result };
  }

  @Post()
  create(@Body() createBoxDto: CreateBoxDto) {
    return this.boxesService.create(createBoxDto);
  }

  @Get()
  findAll() {
    return this.boxesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boxesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBoxDto: UpdateBoxDto) {
    return this.boxesService.update(id, updateBoxDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boxesService.remove(id);
  }
}
