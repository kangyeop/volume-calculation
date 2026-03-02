import { Injectable } from '@nestjs/common';
import { UploadRepository } from '../repositories/upload.repository';
import { DataTransformerService } from './data-transformer.service';
import { UploadSessionService } from './upload-session.service';
import { CreateOutboundDto } from '../dto/create-outbound.dto';

@Injectable()
export class UploadConfirmService {
  constructor(
    private readonly uploadRepository: UploadRepository,
    private readonly dataTransformerService: DataTransformerService,
    private readonly uploadSessionService: UploadSessionService,
  ) {}

  async confirmOutboundUpload(
    sessionId: string,
    mapping: Record<string, string | null>,
  ): Promise<{ imported: number; batchId: string; batchName: string }> {
    const session = this.uploadSessionService.getSession(sessionId);

    if (!session) {
      throw new Error('Upload session not found');
    }

    const transformedData = this.dataTransformerService.transformOutboundRows(
      session.rows,
      mapping as Record<string, string>,
    );

    const outbounds: CreateOutboundDto[] = transformedData.map((item) => ({
      orderId: item.orderId,
      sku: item.sku,
      quantity: item.quantity,
      recipientName: item.recipientName,
      address: item.address,
    }));

    const {
      outbounds: savedOutbounds,
      batchId,
      batchName,
    } = await this.uploadRepository.createOutboundsWithOrder(
      session.projectId,
      outbounds,
    );

    this.uploadSessionService.cleanup(sessionId);

    return { imported: savedOutbounds.length, batchId, batchName };
  }

  async confirmProductUpload(
    sessionId: string,
    mapping: Record<string, string | null>,
  ): Promise<{ imported: number }> {
    const session = this.uploadSessionService.getSession(sessionId);

    if (!session) {
      throw new Error('Upload session not found');
    }

    const separator = mapping.separator || 'x';

    const transformedData = this.dataTransformerService.transformProductRows(
      session.rows,
      separator,
    );

    await this.uploadRepository.createProductsWithUpsert(session.projectId, transformedData);

    this.uploadSessionService.cleanup(sessionId);

    return { imported: transformedData.length };
  }
}
