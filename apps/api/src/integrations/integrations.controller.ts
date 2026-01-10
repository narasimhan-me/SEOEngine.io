import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IntegrationsService, CreateIntegrationDto, UpdateIntegrationDto } from './integrations.service';
import { IntegrationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';

/**
 * [ROLES-3 FIXUP-4] IntegrationsController with membership-aware access control:
 * - GET endpoints: any ProjectMember can view (assertProjectAccess)
 * - Mutating endpoints (POST, PUT, DELETE): OWNER-only (assertOwnerRole)
 */
@Controller('integrations')
@UseGuards(JwtAuthGuard) // [SELF-SERVICE-1] All integration routes require authentication
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * GET /integrations?projectId=xxx
   * List all integrations for a project
   * [ROLES-3 FIXUP-4] Any ProjectMember can view (assertProjectAccess)
   */
  @Get()
  async listIntegrations(
    @Request() req: any,
    @Query('projectId') projectId: string,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    // [ROLES-3 FIXUP-4] Any ProjectMember can view integrations
    await this.roleResolution.assertProjectAccess(projectId, req.user.id);

    const integrations = await this.integrationsService.getProjectIntegrations(projectId);
    return {
      projectId,
      integrations: integrations.map((i) => ({
        id: i.id,
        type: i.type,
        externalId: i.externalId,
        hasAccessToken: !!i.accessToken,
        config: i.config,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    };
  }

  /**
   * GET /integrations/:type?projectId=xxx
   * Get a specific integration by type
   * [ROLES-3 FIXUP-4] Any ProjectMember can view (assertProjectAccess)
   */
  @Get(':type')
  async getIntegration(
    @Request() req: any,
    @Param('type') type: string,
    @Query('projectId') projectId: string,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    // [ROLES-3 FIXUP-4] Any ProjectMember can view integrations
    await this.roleResolution.assertProjectAccess(projectId, req.user.id);

    const integrationType = this.parseIntegrationType(type);
    const integration = await this.integrationsService.getIntegration(projectId, integrationType);

    if (!integration) {
      throw new NotFoundException(`Integration of type ${type} not found`);
    }

    return {
      id: integration.id,
      projectId: integration.projectId,
      type: integration.type,
      externalId: integration.externalId,
      hasAccessToken: !!integration.accessToken,
      config: integration.config,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * POST /integrations
   * Create a new integration
   * [ROLES-3 FIXUP-4] OWNER-only for mutations (assertOwnerRole)
   */
  @Post()
  async createIntegration(
    @Request() req: any,
    @Body() body: {
      projectId: string;
      type: string;
      externalId?: string;
      accessToken?: string;
      config?: Record<string, any>;
    },
  ) {
    if (!body.projectId || !body.type) {
      throw new BadRequestException('projectId and type are required');
    }

    // [ROLES-3 FIXUP-4] OWNER-only for mutations
    await this.roleResolution.assertOwnerRole(body.projectId, req.user.id);

    const integrationType = this.parseIntegrationType(body.type);

    const dto: CreateIntegrationDto = {
      projectId: body.projectId,
      type: integrationType,
      externalId: body.externalId,
      accessToken: body.accessToken,
      config: body.config,
    };

    const integration = await this.integrationsService.createIntegration(dto);

    return {
      id: integration.id,
      projectId: integration.projectId,
      type: integration.type,
      externalId: integration.externalId,
      createdAt: integration.createdAt,
    };
  }

  /**
   * PUT /integrations/:type
   * Update an existing integration
   * [ROLES-3 FIXUP-4] OWNER-only for mutations (assertOwnerRole)
   */
  @Put(':type')
  async updateIntegration(
    @Request() req: any,
    @Param('type') type: string,
    @Query('projectId') projectId: string,
    @Body() body: UpdateIntegrationDto,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    // [ROLES-3 FIXUP-4] OWNER-only for mutations
    await this.roleResolution.assertOwnerRole(projectId, req.user.id);

    const integrationType = this.parseIntegrationType(type);
    const integration = await this.integrationsService.updateIntegration(
      projectId,
      integrationType,
      body,
    );

    return {
      id: integration.id,
      projectId: integration.projectId,
      type: integration.type,
      externalId: integration.externalId,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * DELETE /integrations/:type?projectId=xxx
   * Remove an integration
   * [ROLES-3 FIXUP-4] OWNER-only for mutations (assertOwnerRole)
   */
  @Delete(':type')
  async deleteIntegration(
    @Request() req: any,
    @Param('type') type: string,
    @Query('projectId') projectId: string,
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    // [ROLES-3 FIXUP-4] OWNER-only for mutations
    await this.roleResolution.assertOwnerRole(projectId, req.user.id);

    const integrationType = this.parseIntegrationType(type);
    await this.integrationsService.deleteIntegration(projectId, integrationType);

    return {
      success: true,
      message: `Integration of type ${type} has been removed`,
    };
  }

  /**
   * GET /integrations/types/available
   * Get list of all available integration types
   */
  @Get('types/available')
  getAvailableTypes() {
    return {
      types: Object.values(IntegrationType).map((type) => ({
        value: type,
        label: this.getIntegrationLabel(type),
        description: this.getIntegrationDescription(type),
      })),
    };
  }

  private parseIntegrationType(type: string): IntegrationType {
    const upperType = type.toUpperCase();
    if (!Object.values(IntegrationType).includes(upperType as IntegrationType)) {
      throw new BadRequestException(
        `Invalid integration type: ${type}. Valid types: ${Object.values(IntegrationType).join(', ')}`,
      );
    }
    return upperType as IntegrationType;
  }

  private getIntegrationLabel(type: IntegrationType): string {
    const labels: Record<IntegrationType, string> = {
      [IntegrationType.SHOPIFY]: 'Shopify',
      [IntegrationType.WOOCOMMERCE]: 'WooCommerce',
      [IntegrationType.BIGCOMMERCE]: 'BigCommerce',
      [IntegrationType.MAGENTO]: 'Magento',
      [IntegrationType.CUSTOM_WEBSITE]: 'Custom Website',
    };
    return labels[type];
  }

  private getIntegrationDescription(type: IntegrationType): string {
    const descriptions: Record<IntegrationType, string> = {
      [IntegrationType.SHOPIFY]: 'Connect your Shopify store for product sync and SEO optimization',
      [IntegrationType.WOOCOMMERCE]: 'Connect your WooCommerce store via REST API',
      [IntegrationType.BIGCOMMERCE]: 'Connect your BigCommerce store for product management',
      [IntegrationType.MAGENTO]: 'Connect your Magento 2 store via REST API',
      [IntegrationType.CUSTOM_WEBSITE]: 'Connect any website for SEO scanning and analysis',
    };
    return descriptions[type];
  }
}
