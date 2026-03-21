import { writeFile, readFile, access, unlink } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

const uploadsDir = join(process.cwd(), 'uploads');
const outboundDir = join(uploadsDir, 'outbound');

function ensureDirectories(): void {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(outboundDir)) {
    fs.mkdirSync(outboundDir, { recursive: true });
  }
}

ensureDirectories();

export async function saveFile(fileBuffer: Buffer, filename: string): Promise<string> {
  ensureDirectories();
  const filePath = join(outboundDir, filename);
  await writeFile(filePath, fileBuffer);
  return filePath;
}

export async function readFileFromStorage(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    throw new Error(`Failed to delete file: ${filePath}`);
  }
}
