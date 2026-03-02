import { Injectable } from '@nestjs/common';
import { UploadRepository } from '../repositories/upload.repository';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';

@Injectable()
export class UploadConfirmService {
  constructor(private readonly uploadRepository: UploadRepository) {}

  async confirmUpload(confirmUploadDto: ConfirmUploadDto): Promise<{ imported: number; batchId: string; batchName: string }> {
    const { projectId, orders } = confirmUploadDto;

    const { outbounds, batchId, batchName } = await this.uploadRepository.createOutboundsWithOrder(projectId, orders);

    return { imported: outbounds.length, batchId, batchName };
  }
}
