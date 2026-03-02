import { Injectable } from '@nestjs/common';
import { writeFile, readFile, access, unlink } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class FileStorageService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');
  private readonly outboundDir = join(this.uploadsDir, 'outbound');

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.outboundDir)) {
      fs.mkdirSync(this.outboundDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, filename: string): Promise<string> {
    this.ensureDirectories();
    const filePath = join(this.outboundDir, filename);
    await writeFile(filePath, fileBuffer);
    return filePath;
  }

  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await readFile(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${filePath}`);
    }
  }

  getOutboundPath(batchId: string, originalFilename: string): string {
    const ext = originalFilename.split('.').pop();
    return join(this.outboundDir, `${batchId}.${ext || 'xlsx'}`);
  }
}
