import {
  BadRequestException,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  Body,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { isE2EMode } from '../config/test-env-guard';
import {
  createTestUser,
  createTestProject,
  createTestProducts,
  createTestShopifyStoreConnection,
} from './index';

class ConnectShopifyBody {
  projectId!: string;
}

@Controller('testkit/e2e')
export class E2eTestkitController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private ensureE2eMode(): void {
    if (!isE2EMode()) {
      throw new ForbiddenException('E2E testkit endpoints are disabled');
    }
  }

  /**
   * POST /testkit/e2e/seed-first-deo-win
   *
   * Seed a Pro-plan user + project + 3 products with missing SEO fields,
   * but WITHOUT a connected store or crawl/DEO state.
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - productIds[]
   * - accessToken (JWT for the user)
   */
  @Post('seed-first-deo-win')
  async seedFirstDeoWin() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const products = await createTestProducts(this.prisma as any, {
      projectId: project.id,
      count: 3,
      withSeo: false,
      withIssues: true,
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      projectId: project.id,
      productIds: products.map((p) => p.id),
      accessToken,
    };
  }

  /**
   * POST /testkit/e2e/seed-playbook-no-eligible-products
   *
   * Seed a Pro-plan user + project where all products already have complete SEO metadata.
   * Used to verify Automation Playbooks zero-eligibility UX and gating.
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - accessToken
   */
  @Post('seed-playbook-no-eligible-products')
  async seedPlaybookNoEligibleProducts() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    await createTestProducts(this.prisma as any, {
      projectId: project.id,
      count: 3,
      withSeo: true,
      withIssues: false,
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      projectId: project.id,
      accessToken,
    };
  }

  /**
   * POST /testkit/e2e/connect-shopify
   *
   * In E2E mode, creates a mocked Shopify integration for the project.
   * No real OAuth or Shopify calls are made.
   */
  @Post('connect-shopify')
  async connectShopify(@Body() body: ConnectShopifyBody) {
    this.ensureE2eMode();

    if (!body?.projectId) {
      throw new BadRequestException('projectId is required');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: body.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const integration = await createTestShopifyStoreConnection(
      this.prisma as any,
      {
        projectId: project.id,
      },
    );

    return {
      projectId: project.id,
      shopDomain: integration.externalId,
    };
  }
}
