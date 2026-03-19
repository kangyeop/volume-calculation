import { Controller, Get, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadTemplateRepository } from '../repositories/upload-template.repository';

@ApiTags('upload-templates')
@Controller('upload-templates')
export class UploadTemplateController {
  constructor(private readonly uploadTemplateRepository: UploadTemplateRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all upload templates' })
  async list() {
    const templates = await this.uploadTemplateRepository.findAll();
    return { success: true, data: templates };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an upload template' })
  async remove(@Param('id') id: string) {
    await this.uploadTemplateRepository.delete(id);
    return { success: true };
  }
}
