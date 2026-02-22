import { Injectable, Logger } from '@nestjs/common';

export interface UploadSession {
  id: string;
  type: 'outbound' | 'product';
  projectId: string;
  headers: string[];
  mapping?: Record<string, unknown>;
  originalMapping?: Record<string, unknown>;
  rows: Record<string, unknown>[];
  fileName: string;
  createdAt: Date;
}

interface SessionWithTimeout extends UploadSession {
  timeout?: NodeJS.Timeout;
}

@Injectable()
export class UploadSessionService {
  private readonly logger = new Logger(UploadSessionService.name);
  private readonly sessions = new Map<string, SessionWithTimeout>();
  private readonly TTL = 30 * 60 * 1000;

  createSession(data: {
    type: 'outbound' | 'product';
    projectId: string;
    headers: string[];
    mapping?: Record<string, unknown>;
    rows: Record<string, unknown>[];
    fileName: string;
  }): string {
    const id = crypto.randomUUID();
    const session: SessionWithTimeout = {
      id,
      type: data.type,
      projectId: data.projectId,
      headers: data.headers,
      mapping: data.mapping,
      originalMapping: data.mapping,
      rows: data.rows,
      fileName: data.fileName,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);

    const timeout = setTimeout(() => {
      this.deleteSession(id);
      this.logger.debug(`Session ${id} expired and was removed`);
    }, this.TTL);

    session.timeout = timeout;

    this.logger.log(`Created session ${id} for ${data.type} upload`);

    return id;
  }

  getSession(id: string): UploadSession | undefined {
    return this.sessions.get(id);
  }

  updateMapping(id: string, mapping: Record<string, unknown>): void {
    const session = this.sessions.get(id);
    if (session) {
      session.mapping = mapping;
      this.logger.debug(`Updated mapping for session ${id}`);
    }
  }

  deleteSession(id: string): void {
    const session = this.sessions.get(id);
    if (session && session.timeout) {
      clearTimeout(session.timeout);
    }
    this.sessions.delete(id);
    this.logger.log(`Deleted session ${id}`);
  }
}
