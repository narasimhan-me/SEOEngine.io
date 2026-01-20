import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';

export interface CreateIntegrationDto {
  projectId: string;
  type: IntegrationType;
  externalId?: string;
  accessToken?: string;
  config?: Record<string, any>;
}

export interface UpdateIntegrationDto {
  externalId?: string;
  accessToken?: string;
  config?: Record<string, any>;
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all integrations for a project
   */
  async getProjectIntegrations(projectId: string) {
    return this.prisma.integration.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific integration by project and type
   */
  async getIntegration(projectId: string, type: IntegrationType) {
    return this.prisma.integration.findUnique({
      where: {
        projectId_type: {
          projectId,
          type,
        },
      },
    });
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: string) {
    return this.prisma.integration.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new integration
   */
  async createIntegration(dto: CreateIntegrationDto) {
    // Check if integration already exists
    const existing = await this.getIntegration(dto.projectId, dto.type);
    if (existing) {
      throw new BadRequestException(
        `Integration of type ${dto.type} already exists for this project`
      );
    }

    return this.prisma.integration.create({
      data: {
        projectId: dto.projectId,
        type: dto.type,
        externalId: dto.externalId,
        accessToken: dto.accessToken,
        config: dto.config,
      },
    });
  }

  /**
   * Update an existing integration
   */
  async updateIntegration(
    projectId: string,
    type: IntegrationType,
    dto: UpdateIntegrationDto
  ) {
    const existing = await this.getIntegration(projectId, type);
    if (!existing) {
      throw new NotFoundException(
        `Integration of type ${type} not found for this project`
      );
    }

    return this.prisma.integration.update({
      where: {
        projectId_type: {
          projectId,
          type,
        },
      },
      data: {
        externalId: dto.externalId ?? existing.externalId,
        accessToken: dto.accessToken ?? existing.accessToken,
        config: dto.config ?? existing.config,
      },
    });
  }

  /**
   * Upsert an integration (create or update)
   */
  async upsertIntegration(dto: CreateIntegrationDto) {
    return this.prisma.integration.upsert({
      where: {
        projectId_type: {
          projectId: dto.projectId,
          type: dto.type,
        },
      },
      create: {
        projectId: dto.projectId,
        type: dto.type,
        externalId: dto.externalId,
        accessToken: dto.accessToken,
        config: dto.config,
      },
      update: {
        externalId: dto.externalId,
        accessToken: dto.accessToken,
        config: dto.config,
      },
    });
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(projectId: string, type: IntegrationType) {
    const existing = await this.getIntegration(projectId, type);
    if (!existing) {
      throw new NotFoundException(
        `Integration of type ${type} not found for this project`
      );
    }

    return this.prisma.integration.delete({
      where: {
        projectId_type: {
          projectId,
          type,
        },
      },
    });
  }

  /**
   * Check if a project has a specific integration type
   */
  async hasIntegration(
    projectId: string,
    type: IntegrationType
  ): Promise<boolean> {
    const integration = await this.getIntegration(projectId, type);
    return !!integration;
  }

  /**
   * Get integration types for a project
   */
  async getIntegrationTypes(projectId: string): Promise<IntegrationType[]> {
    const integrations = await this.prisma.integration.findMany({
      where: { projectId },
      select: { type: true },
    });
    return integrations.map((i) => i.type);
  }
}
