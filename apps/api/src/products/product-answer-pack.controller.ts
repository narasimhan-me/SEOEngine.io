import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductAnswerPackService } from './product-answer-pack.service';

@Controller('products')
export class ProductAnswerPackController {
  constructor(private readonly answerPack: ProductAnswerPackService) {}

  /**
   * Generate an Answer Pack draft (rewritten description + answer blocks) for a product.
   */
  @Post(':id/answer-pack/generate')
  @UseGuards(JwtAuthGuard)
  async generate(
    @Request() req: any,
    @Param('id') productId: string,
    @Body()
    body: {
      complianceMode?: 'supplements_us' | 'none';
      questionCount?: number;
    }
  ) {
    if (!productId) throw new BadRequestException('Missing productId');
    return this.answerPack.generateDraft(productId, req.user.id, {
      complianceMode: body?.complianceMode ?? 'supplements_us',
      questionCount: body?.questionCount ?? 10,
    });
  }

  /**
   * Publish an Answer Pack: overwrite Shopify product body_html + persist answer blocks.
   */
  @Post(':id/answer-pack/publish')
  @UseGuards(JwtAuthGuard)
  async publish(
    @Request() req: any,
    @Param('id') productId: string,
    @Body()
    body: {
      complianceMode?: 'supplements_us' | 'none';
      questionCount?: number;
      dryRun?: boolean;
    }
  ) {
    if (!productId) throw new BadRequestException('Missing productId');
    return this.answerPack.generateAndPublish(productId, req.user.id, {
      complianceMode: body?.complianceMode ?? 'supplements_us',
      questionCount: body?.questionCount ?? 10,
      dryRun: body?.dryRun ?? false,
    });
  }

  /**
   * Bulk publish Answer Packs for a list of productIds.
   */
  @Post('answer-pack/bulk-publish')
  @UseGuards(JwtAuthGuard)
  async bulkPublish(
    @Request() req: any,
    @Body()
    body: {
      productIds: string[];
      complianceMode?: 'supplements_us' | 'none';
      questionCount?: number;
      dryRun?: boolean;
    }
  ) {
    const productIds = body?.productIds ?? [];
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new BadRequestException('Missing productIds');
    }

    return this.answerPack.bulkGenerateAndPublish(productIds, req.user.id, {
      complianceMode: body?.complianceMode ?? 'supplements_us',
      questionCount: body?.questionCount ?? 10,
      dryRun: body?.dryRun ?? false,
    });
  }
}
