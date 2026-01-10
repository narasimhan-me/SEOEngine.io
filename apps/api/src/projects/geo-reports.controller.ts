import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeoReportsService } from './geo-reports.service';

/**
 * [GEO-EXPORT-1] GEO Reports Controller (Authenticated)
 *
 * Endpoints for assembling GEO reports and managing share links.
 * All endpoints require JWT authentication.
 */
@Controller('projects/:projectId/geo-reports')
@UseGuards(JwtAuthGuard)
export class GeoReportsController {
  constructor(private readonly geoReportsService: GeoReportsService) {}

  /**
   * GET /projects/:projectId/geo-reports/assemble
   * Assemble GEO report data for export/print
   */
  @Get('assemble')
  async assembleReport(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.geoReportsService.assembleReport(projectId, req.user.id);
  }

  /**
   * POST /projects/:projectId/geo-reports/share-links
   * Create a shareable link for the GEO report
   * [ENTERPRISE-GEO-1] Now supports audience and passcode protection
   */
  @Post('share-links')
  async createShareLink(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() body: { title?: string; audience?: 'ANYONE_WITH_LINK' | 'PASSCODE' },
  ) {
    return this.geoReportsService.createShareLink(projectId, req.user.id, body);
  }

  /**
   * GET /projects/:projectId/geo-reports/share-links
   * List all share links for a project
   */
  @Get('share-links')
  async listShareLinks(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.geoReportsService.listShareLinks(projectId, req.user.id);
  }

  /**
   * DELETE /projects/:projectId/geo-reports/share-links/:linkId
   * Revoke a share link
   */
  @Delete('share-links/:linkId')
  async revokeShareLink(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.geoReportsService.revokeShareLink(projectId, linkId, req.user.id);
  }
}
