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
   * POST /testkit/e2e/seed-work-queue-zero-eligible-draft
   * Seed a Pro-plan user + project where products have complete SEO metadata (eligibleCount = 0),
   * but an existing AutomationPlaybookDraft exists (simulating a stale/broken Work Queue tile scenario).
   * Used to verify ZERO-AFFECTED-SUPPRESSION-1 Work Queue suppression (no dead-end CTAs).
   */
  @Post('seed-work-queue-zero-eligible-draft')
  async seedWorkQueueZeroEligibleDraft() {
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
      withSeo: true,
      withIssues: false,
    });
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_title',
        scopeId: 'test-scope-id',
        rulesHash: 'test-rules-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: products.map((p) => p.id) as unknown as any,
        draftItems: [] as unknown as any,
        counts: {
          affectedTotal: products.length,
          draftGenerated: products.length,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: false } as unknown as any,
      },
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

  // ==========================================================================
  // [SELF-SERVICE-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-self-service-user
   *
   * Seed a user with chosen plan and some runs (including reused) for AI usage page validation.
   * Also creates at least one Shopify-connected project for stores page validation.
   *
   * Body:
   * - plan: "free" | "pro" | "business" (default: "pro")
   * - accountRole: "OWNER" | "EDITOR" | "VIEWER" (default: "OWNER")
   * - includeRuns: boolean (default: true)
   *
   * Returns:
   * - user (id, email, accountRole)
   * - projectId
   * - shopDomain
   * - accessToken
   */
  @Post('seed-self-service-user')
  async seedSelfServiceUser(
    @Body()
    body: {
      plan?: string;
      accountRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
      includeRuns?: boolean;
    } = {},
  ) {
    this.ensureE2eMode();

    const plan = body.plan ?? 'pro';
    const accountRole = body.accountRole ?? 'OWNER';
    const includeRuns = body.includeRuns !== false;

    // Create user with specified accountRole
    const { user } = await createTestUser(this.prisma as any, {
      plan,
      accountRole,
    });

    // Create project with Shopify connection
    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const integration = await createTestShopifyStoreConnection(
      this.prisma as any,
      {
        projectId: project.id,
      },
    );

    // Optionally seed some AI usage runs (including reused)
    if (includeRuns) {
      const now = new Date();
      const testPlaybookId = 'test-playbook-id';
      const testScopeId = 'test-scope-id';
      const testRulesHash = 'test-rules-hash';

      // Create some preview runs with AI
      for (let i = 0; i < 5; i++) {
        await this.prisma.automationPlaybookRun.create({
          data: {
            project: { connect: { id: project.id } },
            createdBy: { connect: { id: user.id } },
            playbookId: testPlaybookId,
            scopeId: testScopeId,
            rulesHash: testRulesHash,
            idempotencyKey: `preview-ai-${i}-${Date.now()}`,
            runType: 'PREVIEW_GENERATE',
            status: 'SUCCEEDED',
            aiUsed: true,
            createdAt: new Date(now.getTime() - i * 60000),
          },
        });
      }

      // Create some reused runs (no AI)
      for (let i = 0; i < 3; i++) {
        const originalRun = await this.prisma.automationPlaybookRun.findFirst({
          where: { createdByUserId: user.id, aiUsed: true },
        });

        await this.prisma.automationPlaybookRun.create({
          data: {
            project: { connect: { id: project.id } },
            createdBy: { connect: { id: user.id } },
            playbookId: testPlaybookId,
            scopeId: testScopeId,
            rulesHash: testRulesHash,
            idempotencyKey: `preview-reuse-${i}-${Date.now()}`,
            runType: 'PREVIEW_GENERATE',
            status: 'SUCCEEDED',
            aiUsed: false,
            reusedFromRunId: originalRun?.id,
            reused: true,
            createdAt: new Date(now.getTime() - (5 + i) * 60000),
          },
        });
      }

      // Create some APPLY runs (should never use AI per invariant)
      for (let i = 0; i < 2; i++) {
        await this.prisma.automationPlaybookRun.create({
          data: {
            project: { connect: { id: project.id } },
            createdBy: { connect: { id: user.id } },
            playbookId: testPlaybookId,
            scopeId: testScopeId,
            rulesHash: testRulesHash,
            idempotencyKey: `apply-${i}-${Date.now()}`,
            runType: 'APPLY',
            status: 'SUCCEEDED',
            aiUsed: false, // APPLY never uses AI
            createdAt: new Date(now.getTime() - (8 + i) * 60000),
          },
        });
      }
    }

    // Generate JWT with session ID
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        lastSeenAt: new Date(),
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        accountRole: user.accountRole,
      },
      projectId: project.id,
      shopDomain: integration.externalId,
      accessToken,
    };
  }

  /**
   * POST /testkit/e2e/seed-self-service-editor
   *
   * Convenience endpoint: seeds a user with EDITOR accountRole.
   * Same as seed-self-service-user with accountRole=EDITOR.
   */
  @Post('seed-self-service-editor')
  async seedSelfServiceEditor() {
    return this.seedSelfServiceUser({ accountRole: 'EDITOR', plan: 'pro' });
  }

  /**
   * POST /testkit/e2e/seed-self-service-viewer
   *
   * Convenience endpoint: seeds a user with VIEWER accountRole.
   * Same as seed-self-service-user with accountRole=VIEWER.
   */
  @Post('seed-self-service-viewer')
  async seedSelfServiceViewer() {
    return this.seedSelfServiceUser({ accountRole: 'VIEWER', plan: 'pro' });
  }

  // ==========================================================================
  // [INSIGHTS-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-insights-1
   *
   * Seed a Pro-plan user with:
   * - A Shopify-connected project
   * - Products with mixed SEO state (some fixed, some with issues)
   * - Historical DEO snapshots for trend visualization
   * - AI usage runs (some reused) for quota/efficiency metrics
   * - APPLY runs for fix tracking
   * - Cached offsite/local data for read-only issue computation
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - shopDomain
   * - accessToken
   */
  @Post('seed-insights-1')
  async seedInsights1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const integration = await createTestShopifyStoreConnection(
      this.prisma as any,
      {
        projectId: project.id,
      },
    );

    // Create products with mixed SEO state
    await createTestProducts(this.prisma as any, {
      projectId: project.id,
      count: 10,
      withSeo: false, // Some will be fixed via APPLY runs below
      withIssues: true,
    });

    const now = new Date();

    // Create historical DEO snapshots for trend visualization (last 30 days)
    for (let i = 30; i >= 0; i -= 5) {
      const snapshotDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      // Simulate improving score over time
      const score = Math.min(100, Math.round(45 + (30 - i) * 1.5));

      await this.prisma.deoScoreSnapshot.create({
        data: {
          projectId: project.id,
          overallScore: score,
          contentScore: Math.min(100, Math.round(50 + (30 - i) * 1.0)),
          entityScore: Math.min(100, Math.round(40 + (30 - i) * 1.2)),
          technicalScore: Math.min(100, Math.round(60 + (30 - i) * 0.8)),
          visibilityScore: Math.min(100, Math.round(35 + (30 - i) * 1.5)),
          version: 'v2',
          computedAt: snapshotDate,
          createdAt: snapshotDate,
          metadata: {
            searchIntentFit: Math.min(100, 40 + (30 - i) * 1.2),
            contentCommerceSignals: Math.min(100, 50 + (30 - i) * 1.0),
            technicalIndexability: Math.min(100, 60 + (30 - i) * 0.8),
            metadataSnippetQuality: Math.min(100, 35 + (30 - i) * 1.5),
            mediaAccessibility: Math.min(100, 45 + (30 - i) * 1.1),
            offsiteSignals: Math.min(100, 30 + (30 - i) * 1.3),
            localDiscovery: Math.min(100, 55 + (30 - i) * 0.9),
            competitivePositioning: Math.min(100, 40 + (30 - i) * 1.0),
            v2: {
              components: {
                entityStrength: Math.min(100, 40 + (30 - i) * 1.2),
                intentMatch: Math.min(100, 45 + (30 - i) * 1.1),
                answerability: Math.min(100, 35 + (30 - i) * 1.3),
                aiVisibility: Math.min(100, 30 + (30 - i) * 1.4),
                contentCompleteness: Math.min(100, 50 + (30 - i) * 1.0),
                technicalQuality: Math.min(100, 60 + (30 - i) * 0.8),
              },
            },
          },
        },
      });
    }

    const testPlaybookId = 'insights-test-playbook';
    const testScopeId = `project:${project.id}`;
    const testRulesHash = 'insights-test-hash';

    // Create AI preview runs (some reused for efficiency metrics)
    for (let i = 0; i < 8; i++) {
      await this.prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId: testPlaybookId,
          scopeId: testScopeId,
          rulesHash: testRulesHash,
          idempotencyKey: `insights-preview-ai-${i}-${Date.now()}`,
          runType: 'PREVIEW_GENERATE',
          status: 'SUCCEEDED',
          aiUsed: true,
          createdAt: new Date(now.getTime() - i * 2 * 60 * 60 * 1000),
        },
      });
    }

    // Create reused runs (no AI cost)
    const originalRun = await this.prisma.automationPlaybookRun.findFirst({
      where: { createdByUserId: user.id, aiUsed: true },
    });

    for (let i = 0; i < 5; i++) {
      await this.prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId: testPlaybookId,
          scopeId: testScopeId,
          rulesHash: testRulesHash,
          idempotencyKey: `insights-preview-reuse-${i}-${Date.now()}`,
          runType: 'PREVIEW_GENERATE',
          status: 'SUCCEEDED',
          aiUsed: false,
          reusedFromRunId: originalRun?.id,
          reused: true,
          createdAt: new Date(now.getTime() - (8 + i) * 2 * 60 * 60 * 1000),
        },
      });
    }

    // Create APPLY runs across different pillars for fix tracking
    const pillarPlaybooks = [
      { playbookId: 'search_intent_fix', pillar: 'intent' },
      { playbookId: 'media_accessibility_fix', pillar: 'media' },
      { playbookId: 'competitive_fix', pillar: 'competitive' },
      { playbookId: 'offsite_fix', pillar: 'offsite' },
      { playbookId: 'local_fix', pillar: 'local' },
      { playbookId: 'shopify_product_seo_update', pillar: 'metadata' },
    ];

    for (let i = 0; i < pillarPlaybooks.length; i++) {
      const { playbookId, pillar } = pillarPlaybooks[i];
      await this.prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId,
          scopeId: `product:test-product-${i}`,
          rulesHash: `${pillar}-hash`,
          idempotencyKey: `insights-apply-${pillar}-${Date.now()}`,
          runType: 'APPLY',
          status: 'SUCCEEDED',
          aiUsed: false, // APPLY never uses AI
          createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          meta: {
            pillar,
            source: 'insights-test',
          },
        },
      });
    }

    // Create cached offsite coverage for read-only computation
    // Schema: id, projectId, coverageData (Json), overallScore (Float), status (enum), computedAt
    await this.prisma.projectOffsiteCoverage.create({
      data: {
        projectId: project.id,
        coverageData: {
          backlinks: 5,
          uniqueDomains: 3,
          socialMentions: 2,
          brandSearchVolume: 100,
          competitorGap: 50,
        },
        overallScore: 45.0,
        status: 'LOW',
        computedAt: now,
      },
    });

    // Create cached local coverage for read-only computation
    // Schema: id, projectId, applicabilityStatus, applicabilityReasons, score, status, signalCounts, missingLocalSignalsCount, computedAt
    await this.prisma.projectLocalCoverage.create({
      data: {
        projectId: project.id,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasons: ['HAS_PHYSICAL_LOCATION'],
        score: 65.0,
        status: 'NEEDS_IMPROVEMENT',
        signalCounts: {
          gbp_connected: 1,
          nap_consistent: 0,
          local_reviews: 25,
          citations: 10,
        },
        missingLocalSignalsCount: 2,
        computedAt: now,
      },
    });

    // Generate JWT
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        lastSeenAt: new Date(),
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      projectId: project.id,
      shopDomain: integration.externalId,
      accessToken,
    };
  }

  /**
   * POST /testkit/e2e/seed-geo-insights-2
   *
   * Seed a Pro-plan user with:
   * - A Shopify-connected project
   * - A small set of products with Answer Blocks
   * - A GEO fix application to power trust trajectory metrics
   * - DEO snapshots for Insights charts
   *
   * This seed is intentionally AI-free (no preview calls).
   */
  @Post('seed-geo-insights-2')
  async seedGeoInsights2() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, { plan: 'pro' });
    const project = await createTestProject(this.prisma as any, { userId: user.id });
    const integration = await createTestShopifyStoreConnection(this.prisma as any, { projectId: project.id });
    const products = await createTestProducts(this.prisma as any, {
      projectId: project.id,
      count: 3,
      withSeo: true,
      withIssues: false,
    });

    const p1 = products[0];
    const now = new Date();

    // DEO snapshots (v2 metadata shape expected by Insights)
    for (let i = 30; i >= 0; i -= 10) {
      const snapshotDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const score = Math.min(100, Math.round(55 + (30 - i) * 1.0));
      await this.prisma.deoScoreSnapshot.create({
        data: {
          projectId: project.id,
          overallScore: score,
          contentScore: Math.min(100, 60),
          entityScore: Math.min(100, 55),
          technicalScore: Math.min(100, 70),
          visibilityScore: Math.min(100, 50),
          version: 'v2',
          computedAt: snapshotDate,
          createdAt: snapshotDate,
          metadata: {
            v2: {
              components: {
                entityStrength: 55,
                intentMatch: 58,
                answerability: 52,
                aiVisibility: 49,
                contentCompleteness: 60,
                technicalQuality: 70,
              },
            },
          },
        },
      });
    }

    // Seed Answer Blocks (canonical question IDs)
    await this.prisma.answerBlock.createMany({
      data: [
        {
          productId: p1.id,
          questionId: 'why_choose_this',
          questionText: 'Why choose this?',
          answerText:
            'This is a long, hard-to-scan paragraph that keeps going without structure. ' +
            'It has many sentences so it should fail structure in the heuristic. ' +
            'It continues with more filler content to push the word count above the threshold. ' +
            'Another sentence adds length and ambiguity without giving a clear structure. ' +
            'Yet another sentence adds more words and makes the block harder to scan. ' +
            'Finally, this ends after enough words to exceed the limit.',
          confidenceScore: 0.6,
          sourceType: 'generated',
          sourceFieldsUsed: [],
          version: 'ae_v1',
        },
        {
          productId: products[1].id,
          questionId: 'what_is_it',
          questionText: 'What is this?',
          answerText: 'A concise, factual description with a clear first sentence and a concrete detail (e.g., 2-step setup).',
          confidenceScore: 0.8,
          sourceType: 'generated',
          sourceFieldsUsed: ['e.g.'],
          version: 'ae_v1',
        },
      ],
    });

    // Create a draft + apply-like audit row for GEO trust trajectory (no AI)
    const draft = await this.prisma.productGeoFixDraft.create({
      data: {
        productId: p1.id,
        questionId: 'why_choose_this',
        issueType: 'POOR_ANSWER_STRUCTURE',
        draftPayload: {
          improvedAnswer:
            'Choose this when you need a clear, comparable option for a specific use case.\n\n' +
            '- Works well for common scenarios\n' +
            '- Includes concrete details (e.g., 2-step setup)\n',
        },
        aiWorkKey: `e2e:geo:${project.id}:${p1.id}`,
        generatedWithAi: false,
      },
    });

    // Apply the improved answer to the Answer Block so current GEO reflects post-fix state
    await this.prisma.answerBlock.update({
      where: { productId_questionId: { productId: p1.id, questionId: 'why_choose_this' } },
      data: {
        answerText: (draft.draftPayload as any).improvedAnswer,
        sourceType: 'geo_fix_ai',
        confidenceScore: 0.85,
      },
    });

    await this.prisma.productGeoFixApplication.create({
      data: {
        productId: p1.id,
        draftId: draft.id,
        appliedByUserId: user.id,
        questionId: 'why_choose_this',
        issueType: 'POOR_ANSWER_STRUCTURE',
        beforeConfidence: 'LOW',
        afterConfidence: 'HIGH',
        beforeIssuesCount: 3,
        afterIssuesCount: 0,
        issuesResolvedCount: 3,
        resolvedIssueTypes: ['poor_answer_structure:why_choose_this'],
        appliedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });
    return {
      user: { id: user.id, email: user.email },
      projectId: project.id,
      productId: p1.id,
      shopDomain: integration.externalId,
      accessToken,
    };
  }

  // ==========================================================================
  // [COUNT-INTEGRITY-1.1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-count-integrity-1-1-many-products
   *
   * [COUNT-INTEGRITY-1.1 PATCH 3.6] Regression seed for Gap 3 (True Asset Dedup Beyond Cap-20)
   *
   * Seed a Pro-plan user + project with ≥25 products (30 products) where SEO fields
   * are incomplete so metadata issues affect all products deterministically.
   *
   * This seed verifies:
   * - affectedItemsCount accuracy beyond cap-20 (should equal 30, not capped at 20)
   * - Asset membership checks work for products beyond index 20
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - productIds[] (length = 30)
   * - accessToken
   */
  @Post('seed-count-integrity-1-1-many-products')
  async seedCountIntegrity11ManyProducts() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    // Create 30 products with incomplete SEO (missing title/description)
    const products = await createTestProducts(this.prisma as any, {
      projectId: project.id,
      count: 30,
      withSeo: false, // All products will have missing SEO metadata
      withIssues: true, // Ensure issues are triggered
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
   * POST /testkit/e2e/seed-count-integrity-1-1-many-collections
   *
   * [COUNT-INTEGRITY-1.1 PATCH 4.2 — Gap 3b] Regression seed for pages/collections dedup beyond cap-20
   *
   * Seed a Pro-plan user + project with 30 collection pages with deterministic technical issues
   * (missing metadata, indexability problems, slow load time, etc.)
   *
   * This seed verifies:
   * - affectedItemsCount accuracy for collections beyond cap-20 (should equal 30, not capped at 20)
   * - Asset membership checks work for collections beyond index 20
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - collectionIds[] (length = 30) - CrawlResult IDs for /assets/collections/:id/issues endpoint
   * - collectionUrls[] (length = 30) - URLs for reference
   * - accessToken
   */
  @Post('seed-count-integrity-1-1-many-collections')
  async seedCountIntegrity11ManyCollections() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    // Mark project as crawled
    await this.prisma.project.update({
      where: { id: project.id },
      data: { lastCrawledAt: new Date() },
    });

    // Create 30 collection CrawlResults with deterministic technical issues
    const collectionUrls: string[] = [];
    const collectionIds: string[] = [];
    for (let i = 0; i < 30; i++) {
      const collectionHandle = `test-collection-${i + 1}`;
      const collectionUrl = `https://test-shop.myshopify.com/collections/${collectionHandle}`;
      collectionUrls.push(collectionUrl);

      // [COUNT-INTEGRITY-1.1 PATCH 4.2-FIXUP-1] Capture crawlResult.id for asset endpoint
      const crawlResult = await this.prisma.crawlResult.create({
        data: {
          projectId: project.id,
          url: collectionUrl,
          statusCode: 200,
          // [COUNT-INTEGRITY-1.1 PATCH 4.2] Missing metadata triggers indexability_problems
          title: null, // Missing title
          metaDescription: null, // Missing meta description
          h1: null, // Missing h1
          wordCount: 50, // Low word count (< 400)
          loadTimeMs: 3000, // Slow load (> 2500ms) triggers slow_initial_response
          htmlSize: 1024,
          issues: ['MISSING_TITLE', 'MISSING_META_DESCRIPTION', 'SLOW_LOAD_TIME'],
          lastCrawledAt: new Date(),
        },
      });
      collectionIds.push(crawlResult.id);
    }

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      projectId: project.id,
      collectionIds, // [PATCH 4.2-FIXUP-1] Return IDs for asset endpoint
      collectionUrls,
      accessToken,
    };
  }
}
