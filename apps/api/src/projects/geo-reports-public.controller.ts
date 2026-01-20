import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GeoReportsService } from './geo-reports.service';

/**
 * [GEO-EXPORT-1] Public GEO Reports Controller (No Auth)
 *
 * Public endpoint for viewing shared GEO reports.
 * No authentication required - uses share token for access.
 */
@Controller('public/geo-reports')
export class GeoReportsPublicController {
  constructor(private readonly geoReportsService: GeoReportsService) {}

  /**
   * GET /public/geo-reports/:shareToken
   * View a shared GEO report (public, no auth)
   * [ENTERPRISE-GEO-1] For passcode-protected links, returns passcode_required status
   *
   * Returns:
   * - status: 'valid' | 'expired' | 'revoked' | 'not_found' | 'passcode_required' | 'passcode_invalid'
   * - report: GeoReportData (only if status === 'valid')
   * - expiresAt: ISO timestamp (only if status === 'valid')
   * - generatedAt: ISO timestamp (only if status === 'valid')
   * - passcodeLast4: Last 4 chars of passcode (only if status === 'passcode_required' | 'passcode_invalid')
   */
  @Get(':shareToken')
  async getPublicShareView(@Param('shareToken') shareToken: string) {
    return this.geoReportsService.getPublicShareView(shareToken);
  }

  /**
   * POST /public/geo-reports/:shareToken/verify
   * Verify passcode and view a passcode-protected GEO report
   * [ENTERPRISE-GEO-1] Passcode verification endpoint
   */
  @Post(':shareToken/verify')
  async verifyAndGetPublicShareView(
    @Param('shareToken') shareToken: string,
    @Body() body: { passcode: string }
  ) {
    return this.geoReportsService.getPublicShareView(shareToken, body.passcode);
  }
}
