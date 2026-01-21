import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AnswerBlockQuestionId, ANSWER_QUESTION_IDS } from '@engineo/shared';
// Manual testing: docs/manual-testing/phase-ae-1.3-answer-block-persistence.md

export interface AnswerBlockInput {
  questionId: AnswerBlockQuestionId | string;
  question: string;
  answer: string;
  confidence: number;
  sourceType?: string;
  factsUsed?: string[];
}

@Injectable()
export class AnswerBlockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all Answer Blocks for a product.
   */
  async getAnswerBlocks(productId: string) {
    return this.prisma.answerBlock.findMany({
      where: { productId },
      orderBy: { questionId: 'asc' },
    });
  }

  /**
   * Creates or updates Answer Blocks for a product.
   * Normalizes and validates input blocks.
   * Upserts by (productId, questionId) so each question has at most one block.
   * If no valid blocks remain after validation, clears existing blocks for the product.
   */
  async createOrUpdateAnswerBlocks(
    productId: string,
    blocks: AnswerBlockInput[]
  ) {
    const validQuestionIds = new Set<string>(ANSWER_QUESTION_IDS);

    const normalized = (blocks || []).filter((block) => {
      if (!block) return false;
      if (!block.questionId || !block.question || !block.answer) return false;
      if (!validQuestionIds.has(block.questionId as string)) return false;
      return true;
    });

    // If nothing valid, clear existing blocks for this product.
    if (normalized.length === 0) {
      await this.prisma.answerBlock.deleteMany({ where: { productId } });
      return [];
    }

    const results = [];
    for (const block of normalized) {
      const questionId = block.questionId as string;
      const confidence =
        typeof block.confidence === 'number'
          ? Math.min(1, Math.max(0, block.confidence))
          : 0;

      const upserted = await this.prisma.answerBlock.upsert({
        where: {
          productId_questionId: {
            productId,
            questionId,
          },
        },
        create: {
          productId,
          questionId,
          questionText: block.question,
          answerText: block.answer,
          confidenceScore: confidence,
          sourceType: block.sourceType ?? 'generated',
          sourceFieldsUsed: block.factsUsed ?? [],
        },
        update: {
          questionText: block.question,
          answerText: block.answer,
          confidenceScore: confidence,
          sourceType: block.sourceType ?? 'generated',
          sourceFieldsUsed: block.factsUsed ?? [],
        },
      });
      results.push(upserted);
    }

    return results;
  }

  /**
   * Deletes all Answer Blocks for a product.
   * Intended for regenerate flows that want to start from a clean slate.
   */
  async deleteAnswerBlocks(productId: string) {
    await this.prisma.answerBlock.deleteMany({ where: { productId } });
  }
}
