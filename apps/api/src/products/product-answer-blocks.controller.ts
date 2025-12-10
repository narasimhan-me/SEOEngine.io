import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { AnswerBlockService, AnswerBlockInput } from './answer-block.service';

class UpsertAnswerBlocksDto {
  blocks: AnswerBlockInput[];
}

/**
 * Product Answer Blocks Controller
 * Internal/protected endpoints for persisting Answer Blocks per product.
 * Routes:
 *   GET  /products/:id/answer-blocks
 *   POST /products/:id/answer-blocks
 * Ownership is enforced via ProductsService; entitlements do NOT gate persistence.
 * Manual testing: docs/manual-testing/phase-ae-1.3-answer-block-persistence.md
 */
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductAnswerBlocksController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly answerBlockService: AnswerBlockService,
  ) {}

  /**
   * GET /products/:id/answer-blocks
   * Returns persisted Answer Blocks for a product.
   */
  @Get(':id/answer-blocks')
  async getAnswerBlocks(@Request() req: any, @Param('id') productId: string) {
    // Validate ownership via ProductsService
    await this.productsService.getProduct(productId, req.user.id);
    return this.answerBlockService.getAnswerBlocks(productId);
  }

  /**
   * POST /products/:id/answer-blocks
   * Creates or updates Answer Blocks for a product.
   * Expects a list of blocks matching the AnswerBlockInput shape.
   * Entitlements are not enforced here – persistence is allowed for all tiers.
   */
  @Post(':id/answer-blocks')
  async upsertAnswerBlocks(
    @Request() req: any,
    @Param('id') productId: string,
    @Body() dto: UpsertAnswerBlocksDto,
  ) {
    // Validate ownership via ProductsService
    await this.productsService.getProduct(productId, req.user.id);

    if (!dto || !Array.isArray(dto.blocks)) {
      throw new BadRequestException('blocks must be an array');
    }

    return this.answerBlockService.createOrUpdateAnswerBlocks(productId, dto.blocks);
  }
}
