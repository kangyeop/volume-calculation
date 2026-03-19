import { Injectable, Logger } from '@nestjs/common';

interface SessionData {
  rows: Record<string, unknown>[];
  headers: string[];
  fileName: string;
  createdAt: number;
}

@Injectable()
export class UploadSessionService {
  private readonly logger = new Logger(UploadSessionService.name);
  private readonly sessions = new Map<string, SessionData>();
  private readonly TTL = 30 * 60 * 1000;

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  store(sessionId: string, data: Omit<SessionData, 'createdAt'>): void {
    this.sessions.set(sessionId, { ...data, createdAt: Date.now() });
    this.logger.log(`Session stored: ${sessionId} (${data.rows.length} rows)`);
  }

  retrieve(sessionId: string): SessionData | null {
    const data = this.sessions.get(sessionId);
    if (!data) return null;
    if (Date.now() - data.createdAt > this.TTL) {
      this.sessions.delete(sessionId);
      return null;
    }
    return data;
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, data] of this.sessions) {
      if (now - data.createdAt > this.TTL) {
        this.sessions.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} expired sessions`);
    }
  }
}
