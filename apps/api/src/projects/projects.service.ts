import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';

export interface CreateProjectDto {
  name: string;
  domain?: string;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all projects for a user
   */
  async getProjectsForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get project by ID (with ownership check)
   */
  async getProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        domain: dto.domain,
      },
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await this.getProject(projectId, userId);

    // Delete related integrations first
    await this.prisma.integration.deleteMany({
      where: { projectId },
    });

    // Delete related products
    await this.prisma.product.deleteMany({
      where: { projectId },
    });

    // Delete related crawl results
    await this.prisma.crawlResult.deleteMany({
      where: { projectId },
    });

    // Delete the project
    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Get integration status for a project
   */
  async getIntegrationStatus(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Build integration status map for all types
    const integrationMap = new Map(
      project.integrations.map((i) => [i.type, i]),
    );

    const shopifyIntegration = integrationMap.get(IntegrationType.SHOPIFY);
    const woocommerceIntegration = integrationMap.get(IntegrationType.WOOCOMMERCE);
    const bigcommerceIntegration = integrationMap.get(IntegrationType.BIGCOMMERCE);
    const magentoIntegration = integrationMap.get(IntegrationType.MAGENTO);
    const customWebsiteIntegration = integrationMap.get(IntegrationType.CUSTOM_WEBSITE);

    return {
      projectId: project.id,
      projectName: project.name,
      integrations: project.integrations.map((i) => ({
        type: i.type,
        externalId: i.externalId,
        connected: true,
        createdAt: i.createdAt,
        config: i.config,
      })),
      shopify: shopifyIntegration
        ? {
            connected: true,
            shopDomain: shopifyIntegration.externalId,
            installedAt: (shopifyIntegration.config as any)?.installedAt,
            scope: (shopifyIntegration.config as any)?.scope,
          }
        : {
            connected: false,
          },
      woocommerce: woocommerceIntegration
        ? {
            connected: true,
            storeUrl: woocommerceIntegration.externalId,
            createdAt: woocommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      bigcommerce: bigcommerceIntegration
        ? {
            connected: true,
            storeHash: bigcommerceIntegration.externalId,
            createdAt: bigcommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      magento: magentoIntegration
        ? {
            connected: true,
            storeUrl: magentoIntegration.externalId,
            createdAt: magentoIntegration.createdAt,
          }
        : {
            connected: false,
          },
      customWebsite: customWebsiteIntegration
        ? {
            connected: true,
            url: customWebsiteIntegration.externalId,
            createdAt: customWebsiteIntegration.createdAt,
          }
        : {
            connected: false,
          },
    };
  }

  /**
   * Get project with all integrations
   */
  async getProjectWithIntegrations(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /**
   * Validate project ownership
   */
  async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });
    return !!project;
  }
}
