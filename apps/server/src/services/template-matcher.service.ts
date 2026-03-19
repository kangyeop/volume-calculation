import { Injectable, Logger } from '@nestjs/common';
import { UploadTemplateRepository } from '../repositories/upload-template.repository';
import { UploadTemplateEntity } from '../entities/upload-template.entity';

interface MatchResult {
  template: UploadTemplateEntity;
  similarity: number;
}

@Injectable()
export class TemplateMatcherService {
  private readonly logger = new Logger(TemplateMatcherService.name);
  private readonly THRESHOLD = 0.7;

  constructor(private readonly templateRepository: UploadTemplateRepository) {}

  async findBestMatch(
    headers: string[],
    type: 'outbound' | 'product',
  ): Promise<MatchResult | null> {
    const templates = await this.templateRepository.findByType(type);
    if (templates.length === 0) return null;

    let bestMatch: MatchResult | null = null;

    for (const template of templates) {
      const similarity = this.jaccardSimilarity(headers, template.headers);

      if (similarity < this.THRESHOLD) continue;

      if (
        !bestMatch ||
        similarity > bestMatch.similarity ||
        (similarity === bestMatch.similarity &&
          template.usageCount > bestMatch.template.usageCount)
      ) {
        bestMatch = { template, similarity };
      }
    }

    if (bestMatch) {
      this.logger.log(
        `Template matched: "${bestMatch.template.name}" (similarity: ${bestMatch.similarity.toFixed(2)})`,
      );
    }

    return bestMatch;
  }

  private jaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a.map((s) => s.toLowerCase().trim()));
    const setB = new Set(b.map((s) => s.toLowerCase().trim()));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
