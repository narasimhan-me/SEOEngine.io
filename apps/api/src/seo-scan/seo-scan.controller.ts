import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SeoScanService } from './seo-scan.service';
import { EntitlementsService } from '../billing/entitlements.service';

interface StartScanDto {
  projectId: string;
}

interface ProductScanDto {
  productId: string;
}

@Controller('seo-scan')
@UseGuards(JwtAuthGuard)
export class SeoScanController {
  constructor(
    private readonly seoScanService: SeoScanService,
    private readonly entitlementsService: EntitlementsService
  ) {}

  /**
   * POST /seo-scan/start
   * Start a new SEO scan for a project
   */
  @Post('start')
  async startScan(@Request() req: any, @Body() dto: StartScanDto) {
    // Enforce crawl entitlements before triggering a scan.
    // In v1 we crawl a single page per request.
    await this.entitlementsService.enforceEntitlement(req.user.id, 'crawl', 1);

    return this.seoScanService.startScan(dto.projectId, req.user.id);
  }

  /**
   * GET /seo-scan/results?projectId=...
   * Get all scan results for a project
   */
  @Get('results')
  async getResults(@Request() req: any, @Query('projectId') projectId: string) {
    return this.seoScanService.getResults(projectId, req.user.id);
  }

  /**
   * POST /seo-scan/product
   * Scan a single product page
   */
  @Post('product')
  async scanProduct(@Request() req: any, @Body() dto: ProductScanDto) {
    return this.seoScanService.scanProductPage(dto.productId, req.user.id);
  }
}
