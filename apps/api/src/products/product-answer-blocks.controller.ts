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
import { RoleResolutionService } from '../common/role-resolution.service';

class UpsertAnswerBlocksDto {
  blocks: AnswerBlockInput[];
}

/**
 * Product Answer Blocks Controller
 * [ROLES-3 FIXUP-2] Updated with role-based access control
 *
 * Internal/protected endpoints for persisting Answer Blocks per product.
 * Routes:
 *   GET  /products/:id/answer-blocks - Membership-readable (any ProjectMember)
 *   POST /products/:id/answer-blocks - OWNER-only (mutation surface)
 *
 * Manual testing: docs/manual-testing/phase-ae-1.3-answer-block-persistence.md
 */
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductAnswerBlocksController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly answerBlockService: AnswerBlockService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  /**
   * GET /products/:id/answer-blocks
   * Returns persisted Answer Blocks for a product.
   * [ROLES-3 FIXUP-2] Any ProjectMember can view (membership-readable)
   */
  @Get(':id/answer-blocks')
  async getAnswerBlocks(@Request() req: any, @Param('id') productId: string) {
    // [ROLES-3] ProductsService.getProduct already checks membership access
    await this.productsService.getProduct(productId, req.user.id);
    return this.answerBlockService.getAnswerBlocks(productId);
  }

  /**
   * POST /products/:id/answer-blocks
   * Creates or updates Answer Blocks for a product.
   * Expects a list of blocks matching the AnswerBlockInput shape.
   * [ROLES-3 FIXUP-2] OWNER-only (mutation surface)
   */
  @Post(':id/answer-blocks')
  async upsertAnswerBlocks(
    @Request() req: any,
    @Param('id') productId: string,
    @Body() dto: UpsertAnswerBlocksDto
  ) {
    // Get product to access projectId
    const product = await this.productsService.getProduct(
      productId,
      req.user.id
    );

    // [ROLES-3 FIXUP-2] Enforce OWNER-only for mutations
    await this.roleResolution.assertOwnerRole(product.projectId, req.user.id);

    if (!dto || !Array.isArray(dto.blocks)) {
      throw new BadRequestException('blocks must be an array');
    }

    return this.answerBlockService.createOrUpdateAnswerBlocks(
      productId,
      dto.blocks
    );
  }
}
