import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutomationService } from './automation.service';

class TriggerAnswerBlockAutomationDto {
  triggerType?: 'product_synced' | 'issue_detected';
}

/**
 * Product Automation Controller
 *
 * Minimal endpoints for Answer Block automations and automation logs for a single product,
 * used by the Product Workspace AEO / Automation UI.
 *
 * Routes:
 *   POST /products/:id/answer-blocks/automation-run
 *   GET  /products/:id/automation-logs
 *   POST /products/:id/answer-blocks/sync-to-shopify
 */
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductAutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * POST /products/:id/answer-blocks/automation-run
   *
   * Triggers Answer Block automation for a product.
   * Uses AutomationService.triggerAnswerBlockAutomationForProduct.
   */
  @Post(':id/answer-blocks/automation-run')
  async triggerAnswerBlockAutomation(
    @Request() req: any,
    @Param('id') productId: string,
    @Body() body: TriggerAnswerBlockAutomationDto
  ) {
    const triggerType: 'product_synced' | 'issue_detected' =
      body?.triggerType === 'product_synced'
        ? 'product_synced'
        : 'issue_detected';

    await this.automationService.triggerAnswerBlockAutomationForProduct(
      productId,
      req.user.id,
      triggerType
    );

    return {
      productId,
      triggerType,
      enqueued: true,
    };
  }

  /**
   * GET /products/:id/automation-logs
   *
   * Returns Answer Block automation logs for a product, ordered by recency.
   */
  @Get(':id/automation-logs')
  async getAnswerBlockAutomationLogs(
    @Request() req: any,
    @Param('id') productId: string
  ) {
    return this.automationService.getAnswerBlockAutomationLogsForProduct(
      productId,
      req.user.id
    );
  }

  /**
   * POST /products/:id/answer-blocks/sync-to-shopify
   *
   * Manually syncs persisted Answer Blocks for a product to Shopify metafields.
   * Uses AutomationService.syncAnswerBlocksToShopifyNow with entitlement and toggle gating.
   */
  @Post(':id/answer-blocks/sync-to-shopify')
  async syncAnswerBlocksToShopifyNow(
    @Request() req: any,
    @Param('id') productId: string
  ) {
    return this.automationService.syncAnswerBlocksToShopifyNow(
      productId,
      req.user.id
    );
  }
}
