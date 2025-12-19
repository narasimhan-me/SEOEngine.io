import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ANSWER_QUESTION_LABELS,
  evaluateGeoProduct,
  type GeoAnswerUnitInput,
  type GeoIssue,
  type GeoProductEvaluation,
} from '@engineo/shared';

export interface ProductGeoReadinessResponse {
  productId: string;
  evaluatedAt: string;
  citationConfidence: GeoProductEvaluation['citationConfidence'];
  signals: GeoProductEvaluation['signals'];
  answerUnits: Array<
    GeoProductEvaluation['answerUnits'][number] & { questionLabel?: string }
  >;
  issues: Array<GeoIssue & { questionLabel?: string }>;
}

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductGeoReadiness(productId: string, userId: string): Promise<ProductGeoReadinessResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
        answerBlocks: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.project.userId !== userId) throw new ForbiddenException('Access denied');

    const units: GeoAnswerUnitInput[] = (product.answerBlocks ?? []).map((b) => ({
      unitId: b.id,
      questionId: b.questionId,
      answer: b.answerText || '',
      factsUsed: b.sourceFieldsUsed ?? [],
      pillarContext: 'search_intent_fit',
    }));

    const evalResult = evaluateGeoProduct(units);

    const answerUnits = evalResult.answerUnits.map((u) => ({
      ...u,
      questionLabel:
        (u.questionId && (ANSWER_QUESTION_LABELS as any)[u.questionId]) || u.questionId,
    }));

    const issues = evalResult.issues.map((i) => ({
      ...i,
      questionLabel:
        (i.questionId && (ANSWER_QUESTION_LABELS as any)[i.questionId]) || i.questionId,
    }));

    return {
      productId,
      evaluatedAt: new Date().toISOString(),
      citationConfidence: evalResult.citationConfidence,
      signals: evalResult.signals,
      answerUnits,
      issues,
    };
  }
}
