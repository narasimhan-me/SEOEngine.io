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
  // [LIST-SEARCH-FILTER-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-list-search-filter-1
   *
   * [LIST-SEARCH-FILTER-1] Seed for Products list search and filter tests.
   *
   * Creates a project with at least 3 products with known titles and handles
   * suitable for search assertions:
   * - At least one product is status=optimized (complete SEO metadata)
   * - At least one product is status=needs_attention (incomplete SEO)
   * - Creates an AutomationPlaybookDraft (status READY, not applied) whose
   *   draftItems includes exactly one of the seeded product IDs so hasDraft=true
   *   can be validated.
   *
   * Returns:
   * - projectId
   * - accessToken
   * - productIds
   * - titles[] (for search assertions)
   * - handles[] (for search assertions)
   * - optimizedProductId (for status filter assertion)
   * - needsAttentionProductId (for status filter assertion)
   * - draftProductId (for hasDraft filter assertion)
   */
  @Post('seed-list-search-filter-1')
  async seedListSearchFilter1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    // Create 3 products with deterministic titles and handles
    // Product 1: Optimized (complete SEO metadata within length bounds)
    const product1 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ext-product-1',
        title: 'Alpine Mountain Boots',
        handle: 'alpine-mountain-boots',
        // SEO title: 30-60 chars (optimized)
        seoTitle: 'Alpine Mountain Boots - Premium Hiking Footwear',
        // SEO description: 70-155 chars (optimized)
        seoDescription: 'Durable mountain boots designed for serious hikers. Waterproof construction with superior ankle support.',
      },
    });

    // Product 2: Needs attention (missing SEO description)
    const product2 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ext-product-2',
        title: 'Coastal Kayak Pro',
        handle: 'coastal-kayak-pro',
        seoTitle: 'Coastal Kayak Pro - Adventure Awaits',
        seoDescription: null, // Missing = needs_attention
      },
    });

    // Product 3: Needs attention (SEO title too short)
    const product3 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ext-product-3',
        title: 'Summit Backpack',
        handle: 'summit-backpack',
        seoTitle: 'Summit Pack', // Too short (< 30 chars) = needs_attention
        seoDescription: 'A reliable backpack for day hikes and overnight adventures with ergonomic straps and multiple compartments.',
      },
    });

    // Create AutomationPlaybookDraft with product2 in draftItems (for hasDraft filter)
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}`,
        rulesHash: 'list-search-filter-1-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [product2.id] as unknown as any,
        draftItems: [
          {
            productId: product2.id,
            suggestion: 'Generated SEO description for Coastal Kayak Pro',
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        // Not applied, not expired
        appliedAt: null,
        expiresAt: null,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      projectId: project.id,
      accessToken,
      productIds: [product1.id, product2.id, product3.id],
      titles: [product1.title, product2.title, product3.title],
      handles: [product1.handle, product2.handle, product3.handle],
      optimizedProductId: product1.id,
      needsAttentionProductId: product2.id,
      draftProductId: product2.id,
    };
  }

  /**
   * POST /testkit/e2e/seed-list-search-filter-1-1
   *
   * [LIST-SEARCH-FILTER-1.1] Seed for Pages and Collections list search and filter tests.
   *
   * Creates a project with crawl results for pages and collections:
   * - 3 pages (/pages/*) with deterministic titles
   * - 3 collections (/collections/*) with deterministic titles
   * - At least one optimized and one needs_attention of each type
   * - Creates an AutomationPlaybookDraft targeting one page and one collection
   *
   * Returns:
   * - projectId
   * - accessToken
   * - pageIds[] (CrawlResult IDs for pages)
   * - collectionIds[] (CrawlResult IDs for collections)
   * - pageTitles[] (for search assertions)
   * - collectionTitles[] (for search assertions)
   * - optimizedPageId (for status filter assertion)
   * - needsAttentionPageId (for status filter assertion)
   * - optimizedCollectionId (for status filter assertion)
   * - needsAttentionCollectionId (for status filter assertion)
   * - draftPageId (for hasDraft filter assertion)
   * - draftCollectionId (for hasDraft filter assertion)
   */
  @Post('seed-list-search-filter-1-1')
  async seedListSearchFilter11() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const baseUrl = 'https://test-shop.myshopify.com';

    // Create 3 pages as CrawlResults
    // Page 1: Optimized (complete SEO metadata within length bounds)
    const page1 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/about-us`,
        statusCode: 200,
        // SEO title: 30-60 chars (optimized)
        title: 'About Our Company - Learn About Our Story',
        // SEO description: 70-155 chars (optimized)
        metaDescription: 'Discover our company history, mission, and the team behind our success. Founded with a passion for quality.',
        h1: 'About Us',
        wordCount: 500,
        loadTimeMs: 250,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 2: Needs attention (missing description)
    const page2 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/contact`,
        statusCode: 200,
        title: 'Contact Us - Get in Touch',
        metaDescription: null, // Missing = needs_attention
        h1: 'Contact Us',
        wordCount: 200,
        loadTimeMs: 180,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 3: Needs attention (title too short)
    const page3 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/faq`,
        statusCode: 200,
        title: 'FAQ', // Too short (< 30 chars) = needs_attention
        metaDescription: 'Find answers to commonly asked questions about our products, shipping, returns, and customer support.',
        h1: 'Frequently Asked Questions',
        wordCount: 800,
        loadTimeMs: 200,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create 3 collections as CrawlResults
    // Collection 1: Optimized (complete SEO metadata)
    const collection1 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/summer-sale`,
        statusCode: 200,
        // SEO title: 30-60 chars (optimized)
        title: 'Summer Sale Collection - Save Up to 50%',
        // SEO description: 70-155 chars (optimized)
        metaDescription: 'Shop our summer sale collection with discounts up to 50% off. Limited time offers on seasonal favorites.',
        h1: 'Summer Sale',
        wordCount: 300,
        loadTimeMs: 220,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 2: Needs attention (missing description)
    const collection2 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/new-arrivals`,
        statusCode: 200,
        title: 'New Arrivals - Latest Products',
        metaDescription: null, // Missing = needs_attention
        h1: 'New Arrivals',
        wordCount: 250,
        loadTimeMs: 190,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 3: Needs attention (title too short)
    const collection3 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/footwear`,
        statusCode: 200,
        title: 'Footwear', // Too short (< 30 chars) = needs_attention
        metaDescription: 'Browse our complete collection of footwear including boots, sneakers, sandals, and more for all occasions.',
        h1: 'Footwear Collection',
        wordCount: 400,
        loadTimeMs: 210,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for PAGES with page2 (for hasDraft filter)
    // Note: draftItems is a Json field, not a relation
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:pages`,
        rulesHash: 'list-search-filter-1-1-pages-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          {
            crawlResultId: page2.id,
            suggestedTitle: null,
            suggestedDescription: 'Generated SEO description for Contact page',
            status: 'READY',
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // Create AutomationPlaybookDraft for COLLECTIONS with collection2 (for hasDraft filter)
    // Note: draftItems is a Json field, not a relation
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:collections`,
        rulesHash: 'list-search-filter-1-1-collections-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          {
            crawlResultId: collection2.id,
            suggestedTitle: null,
            suggestedDescription: 'Generated SEO description for New Arrivals collection',
            status: 'READY',
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      projectId: project.id,
      accessToken,
      pageIds: [page1.id, page2.id, page3.id],
      collectionIds: [collection1.id, collection2.id, collection3.id],
      pageTitles: [page1.title, page2.title, page3.title],
      collectionTitles: [collection1.title, collection2.title, collection3.title],
      optimizedPageId: page1.id,
      needsAttentionPageId: page2.id,
      optimizedCollectionId: collection1.id,
      needsAttentionCollectionId: collection2.id,
      draftPageId: page2.id,
      draftCollectionId: collection2.id,
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
          issues: ['MISSING_TITLE', 'MISSING_META_DESCRIPTION', 'SLOW_LOAD_TIME'],
          scannedAt: new Date(),
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

  // ==========================================================================
  // [LIST-ACTIONS-CLARITY-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-list-actions-clarity-1
   *
   * [LIST-ACTIONS-CLARITY-1] Seed for row chip and action tests.
   * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Extended with:
   * - Collections support
   * - EDITOR access token (for Blocked state testing)
   * - Governance policy enabled for approval gating
   *
   * Creates a project with products, pages, and collections in various states:
   * - Product 1: Optimized (complete SEO, no draft)
   * - Product 2: Needs attention (incomplete SEO, no draft)
   * - Product 3: Draft pending (has pending draft, owner can apply)
   * - Page 1: Optimized (complete SEO, no draft)
   * - Page 2: Needs attention (incomplete SEO, no draft)
   * - Page 3: Draft pending (has pending draft)
   * - Collection 1: Optimized (complete SEO, no draft)
   * - Collection 2: Needs attention (incomplete SEO, no draft)
   * - Collection 3: Draft pending (has pending draft)
   *
   * Returns:
   * - projectId
   * - accessToken (OWNER)
   * - editorAccessToken (EDITOR - for Blocked state tests)
   * - optimizedProductId
   * - needsAttentionProductId
   * - draftPendingProductId
   * - optimizedPageId
   * - needsAttentionPageId
   * - draftPendingPageId
   * - optimizedCollectionId
   * - needsAttentionCollectionId
   * - draftPendingCollectionId
   */
  @Post('seed-list-actions-clarity-1')
  async seedListActionsClarity1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const baseUrl = 'https://test-shop.myshopify.com';

    // Product 1: Optimized (complete SEO metadata)
    const product1 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'lac1-product-1',
        title: 'Optimized Product - Complete SEO',
        description: 'This product has complete SEO metadata.',
        handle: 'optimized-product',
        seoTitle: 'Optimized Product - Best Quality Item for Your Needs',
        seoDescription: 'Discover our optimized product with premium quality and excellent features. Perfect for everyday use and great value.',
        lastSyncedAt: new Date(),
      },
    });

    // Product 2: Needs attention (missing SEO description)
    const product2 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'lac1-product-2',
        title: 'Product Missing SEO Description',
        description: 'This product is missing SEO description.',
        handle: 'needs-attention-product',
        seoTitle: 'Product Title That Needs Attention',
        seoDescription: null, // Missing = needs attention
        lastSyncedAt: new Date(),
      },
    });

    // Product 3: Draft pending (will have a draft created)
    const product3 = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'lac1-product-3',
        title: 'Product With Pending Draft',
        description: 'This product has a pending draft.',
        handle: 'draft-pending-product',
        seoTitle: 'Short', // Short title = needs attention
        seoDescription: null, // Missing
        lastSyncedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for product3
    // [DRAFT-ENTRYPOINT-UNIFICATION-1] Use canonical draft shape (field/rawSuggestion/finalSuggestion)
    // to support edit functionality in Drafts tab
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:products`,
        rulesHash: 'list-actions-clarity-1-products-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [product3.id] as unknown as any,
        draftItems: [
          {
            productId: product3.id,
            field: 'seoDescription',
            rawSuggestion: 'A comprehensive description for the product that improves search visibility and user experience.',
            finalSuggestion: 'A comprehensive description for the product that improves search visibility and user experience.',
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // Page 1: Optimized (complete SEO metadata)
    const page1 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/optimized-page`,
        statusCode: 200,
        title: 'Optimized Page - Everything You Need to Know',
        metaDescription: 'Discover everything about our optimized page. Complete information with all the details you need for success.',
        h1: 'Optimized Page',
        wordCount: 500,
        loadTimeMs: 200,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 2: Needs attention (missing description)
    const page2 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/needs-attention`,
        statusCode: 200,
        title: 'Page Needs Attention - Missing Description',
        metaDescription: null, // Missing = needs attention
        h1: 'Needs Attention',
        wordCount: 300,
        loadTimeMs: 150,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 3: Draft pending (will have a draft created)
    const page3 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/draft-pending`,
        statusCode: 200,
        title: 'Short', // Short title = needs attention
        metaDescription: null, // Missing
        h1: 'Draft Pending Page',
        wordCount: 100,
        loadTimeMs: 180,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for page3
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:pages`,
        rulesHash: 'list-actions-clarity-1-pages-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          {
            crawlResultId: page3.id,
            suggestedTitle: 'Improved Page Title for Better Visibility',
            suggestedDescription: 'A comprehensive page description that improves search visibility.',
            status: 'READY',
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Create Collections
    // Collection 1: Optimized (complete SEO metadata)
    const collection1 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/optimized-collection`,
        statusCode: 200,
        title: 'Optimized Collection - Premium Products Selection',
        metaDescription: 'Browse our optimized collection of premium products. Carefully curated selection with the best quality items.',
        h1: 'Optimized Collection',
        wordCount: 400,
        loadTimeMs: 180,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 2: Needs attention (missing description)
    const collection2 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/needs-attention`,
        statusCode: 200,
        title: 'Collection Needs Attention - Missing Description',
        metaDescription: null, // Missing = needs attention
        h1: 'Needs Attention Collection',
        wordCount: 250,
        loadTimeMs: 200,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 3: Draft pending (will have a draft created)
    const collection3 = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/draft-pending`,
        statusCode: 200,
        title: 'Short', // Short title = needs attention
        metaDescription: null, // Missing
        h1: 'Draft Pending Collection',
        wordCount: 150,
        loadTimeMs: 220,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for collection3
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:collections`,
        rulesHash: 'list-actions-clarity-1-collections-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          {
            crawlResultId: collection3.id,
            suggestedTitle: 'Improved Collection Title for Better Visibility',
            suggestedDescription: 'A comprehensive collection description that improves search visibility.',
            status: 'READY',
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Create EDITOR user for Blocked state testing
    const { user: editorUser } = await createTestUser(this.prisma as any, {
      plan: 'pro',
      accountRole: 'EDITOR',
    });

    // Add EDITOR as project member
    await this.prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: editorUser.id,
        role: 'EDITOR',
      },
    });

    // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Enable governance (approval required)
    // This makes EDITORs see "Blocked" state since they can't apply without approval
    await this.prisma.projectGovernancePolicy.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        requireApprovalForApply: true,
        updatedAt: new Date(),
      },
      update: {
        requireApprovalForApply: true,
        updatedAt: new Date(),
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });
    const editorAccessToken = this.jwtService.sign({ sub: editorUser.id });

    return {
      projectId: project.id,
      accessToken,
      editorAccessToken,
      optimizedProductId: product1.id,
      needsAttentionProductId: product2.id,
      draftPendingProductId: product3.id,
      optimizedPageId: page1.id,
      needsAttentionPageId: page2.id,
      draftPendingPageId: page3.id,
      optimizedCollectionId: collection1.id,
      needsAttentionCollectionId: collection2.id,
      draftPendingCollectionId: collection3.id,
    };
  }

  // ==========================================================================
  // [DRAFT-AI-ENTRYPOINT-CLARITY-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-draft-ai-entrypoint-clarity-1
   *
   * [DRAFT-AI-ENTRYPOINT-CLARITY-1] Seed for AI boundary note visibility tests.
   *
   * Creates a project with:
   * - Products with missing SEO (for generation flow testing)
   * - Products with pending drafts (for review flow testing)
   * - Both scenarios enable testing AI boundary note visibility
   *
   * Returns:
   * - projectId
   * - accessToken
   * - productWithDraftId (for review boundary testing)
   * - productWithoutDraftId (for generate boundary testing)
   */
  @Post('seed-draft-ai-entrypoint-clarity-1')
  async seedDraftAiEntrypointClarity1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    // Product 1: Has pending draft (for Draft Review boundary note testing)
    const productWithDraft = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'daepc1-product-with-draft',
        title: 'Product With Draft For Review',
        description: 'This product has a pending draft for review testing.',
        handle: 'product-with-draft-for-review',
        seoTitle: 'Short', // Needs attention
        seoDescription: null, // Missing
        lastSyncedAt: new Date(),
      },
    });

    // Product 2: No draft (for Generate boundary note testing)
    const productWithoutDraft = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'daepc1-product-without-draft',
        title: 'Product Without Draft For Generate',
        description: 'This product has no draft for generation testing.',
        handle: 'product-without-draft-for-generate',
        seoTitle: null, // Missing = needs attention
        seoDescription: null, // Missing
        lastSyncedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for productWithDraft
    // [DRAFT-AI-ENTRYPOINT-CLARITY-1-FIXUP-1] Use PARTIAL status so Work Queue shows "Generate Full Drafts"
    // Use canonical draft shape (field/rawSuggestion/finalSuggestion)
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:products`,
        rulesHash: 'draft-ai-entrypoint-clarity-1-hash',
        status: 'PARTIAL', // PARTIAL triggers "Generate Full Drafts" CTA in Work Queue
        createdByUserId: user.id,
        sampleProductIds: [productWithDraft.id, productWithoutDraft.id] as unknown as any,
        draftItems: [
          {
            productId: productWithDraft.id,
            field: 'seoDescription',
            rawSuggestion: 'AI-generated draft for testing review boundary note visibility.',
            finalSuggestion: 'AI-generated draft for testing review boundary note visibility.',
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 2, // Both products are eligible
          draftGenerated: 1, // Only one has draft = PARTIAL
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      projectId: project.id,
      accessToken,
      productWithDraftId: productWithDraft.id,
      productWithoutDraftId: productWithoutDraft.id,
    };
  }

  // ==========================================================================
  // [DRAFT-DIFF-CLARITY-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-draft-diff-clarity-1
   *
   * [DRAFT-DIFF-CLARITY-1] Seed for Current vs Draft diff UI tests.
   *
   * Creates a project with:
   * - Product 1: Has live SEO and a draft with different value (for diff display testing)
   * - Product 2: Has live SEO and a draft explicitly cleared (for "Draft will clear" testing)
   * - Product 3: Has live SEO and no draft generated yet (for "No draft generated" testing)
   * - Page: Has draft for Playbooks Draft Review diff testing
   *
   * Returns:
   * - projectId
   * - accessToken
   * - productWithDiffId (has live value + different draft value)
   * - productWithClearedDraftId (has live value + empty draft = "Draft will clear")
   * - productNoDraftId (has live value + no draft = "No draft generated yet")
   * - pageWithDraftId (for Playbooks Draft Review diff testing)
   * - liveSeoTitle (for assertion against "Current (live)" display)
   * - liveSeoDescription (for assertion against "Current (live)" display)
   * - draftSeoTitle (for assertion against "Draft (staged)" display)
   * - draftSeoDescription (for assertion against "Draft (staged)" display)
   */
  @Post('seed-draft-diff-clarity-1')
  async seedDraftDiffClarity1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const baseUrl = 'https://test-shop.myshopify.com';

    // Product 1: Has live SEO + draft with different value (for diff display)
    const liveSeoTitle = 'Original Live SEO Title for Testing';
    const liveSeoDescription = 'This is the original live SEO description that is currently published on the store.';
    const draftSeoTitle = 'Updated Draft SEO Title - AI Generated';
    const draftSeoDescription = 'This is the new AI-generated draft SEO description ready to be applied.';

    const productWithDiff = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ddc1-product-with-diff',
        title: 'Product With Diff Values',
        description: 'This product has live SEO values and a draft with different values.',
        handle: 'product-with-diff-values',
        seoTitle: liveSeoTitle,
        seoDescription: liveSeoDescription,
        lastSyncedAt: new Date(),
      },
    });

    // Product 2: Has live SEO + explicitly cleared draft (for "Draft will clear" message)
    const productWithClearedDraft = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ddc1-product-cleared-draft',
        title: 'Product With Cleared Draft',
        description: 'This product has live SEO values and an explicitly cleared draft.',
        handle: 'product-cleared-draft',
        seoTitle: 'Live Title That Will Be Cleared',
        seoDescription: 'This description will be cleared when the empty draft is applied.',
        lastSyncedAt: new Date(),
      },
    });

    // Product 3: Has live SEO + "No draft generated yet" scenario
    // [DRAFT-DIFF-CLARITY-1-FIXUP-1] This product has a draftItem entry with field present
    // but both rawSuggestion and finalSuggestion empty - triggers "No draft generated yet" message
    const productNoDraft = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'ddc1-product-no-draft',
        title: 'Product Without Draft Generated',
        description: 'This product has live SEO values but draft field has empty suggestions.',
        handle: 'product-no-draft',
        seoTitle: 'Live Title With No Draft',
        seoDescription: 'This description has no corresponding draft generated.',
        lastSyncedAt: new Date(),
      },
    });

    // Page: For Playbooks Draft Review diff testing
    const pageWithDraft = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/draft-diff-test`,
        statusCode: 200,
        title: 'Page With Live And Draft Values',
        metaDescription: 'This is the live page description that will be compared to the draft.',
        h1: 'Draft Diff Test Page',
        wordCount: 300,
        loadTimeMs: 200,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for products with canonical shape
    // [DRAFT-DIFF-CLARITY-1-FIXUP-1] Includes all 3 products to cover all diff scenarios
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_title',
        scopeId: `project:${project.id}:products`,
        rulesHash: 'draft-diff-clarity-1-products-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [productWithDiff.id, productWithClearedDraft.id, productNoDraft.id] as unknown as any,
        draftItems: [
          // Product 1: Has different draft value (diff display scenario)
          {
            productId: productWithDiff.id,
            field: 'seoTitle',
            rawSuggestion: draftSeoTitle,
            finalSuggestion: draftSeoTitle,
            ruleWarnings: [],
          },
          {
            productId: productWithDiff.id,
            field: 'seoDescription',
            rawSuggestion: draftSeoDescription,
            finalSuggestion: draftSeoDescription,
            ruleWarnings: [],
          },
          // Product 2: Explicitly cleared (rawSuggestion exists but finalSuggestion is empty)
          // Triggers "Draft will clear this field when applied" message
          {
            productId: productWithClearedDraft.id,
            field: 'seoDescription',
            rawSuggestion: 'AI generated this but user cleared it',
            finalSuggestion: '', // Explicitly cleared
            ruleWarnings: [],
          },
          // Product 3: No draft generated yet (field present but both rawSuggestion and finalSuggestion empty)
          // [DRAFT-DIFF-CLARITY-1-FIXUP-1] Triggers "No draft generated yet" message
          {
            productId: productNoDraft.id,
            field: 'seoTitle',
            rawSuggestion: '', // Empty - no draft generated
            finalSuggestion: '', // Empty - no draft generated
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 3,
          draftGenerated: 2, // Products 1-2 have actual suggestions; Product 3 is empty
          noSuggestionCount: 1, // Product 3 has no actual suggestion
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // Create AutomationPlaybookDraft for page with canonical shape
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:pages`,
        rulesHash: 'draft-diff-clarity-1-pages-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          {
            crawlResultId: pageWithDraft.id,
            field: 'seoDescription',
            rawSuggestion: 'AI-generated page description for diff testing.',
            finalSuggestion: 'AI-generated page description for diff testing.',
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 1,
          draftGenerated: 1,
          noSuggestionCount: 0,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      projectId: project.id,
      accessToken,
      productWithDiffId: productWithDiff.id,
      productWithClearedDraftId: productWithClearedDraft.id,
      productNoDraftId: productNoDraft.id,
      pageWithDraftId: pageWithDraft.id,
      liveSeoTitle,
      liveSeoDescription,
      draftSeoTitle,
      draftSeoDescription,
    };
  }

  // ==========================================================================
  // [DRAFT-FIELD-COVERAGE-1] E2E Seeds
  // ==========================================================================

  /**
   * POST /testkit/e2e/seed-draft-field-coverage-1
   *
   * [DRAFT-FIELD-COVERAGE-1] Seed for Draft Review parity across asset types.
   *
   * Creates a project with:
   * - Products: 3 products matching DDC1 scenarios (diff / explicit clear / no draft generated yet)
   * - Pages (static): 3 crawlResults under /pages/... for the same 3 scenarios
   * - Collections: 3 crawlResults under /collections/... same scenarios
   *
   * Each asset type has:
   * - Asset 1: Has live SEO and a draft with different value (for diff display testing)
   * - Asset 2: Has live SEO and a draft explicitly cleared (for "Draft will clear" testing)
   * - Asset 3: Has live SEO and no draft generated yet (for "No draft generated" testing)
   *
   * Returns:
   * - projectId
   * - accessToken
   * - Products: productDiffId, productClearId, productNoDraftId
   * - Pages: pageDiffId, pageClearId, pageNoDraftId
   * - Collections: collectionDiffId, collectionClearId, collectionNoDraftId
   * - Live/draft strings for assertions
   * - Counts: { affectedTotal: 3, draftGenerated: 2, noSuggestionCount: 1 }
   */
  @Post('seed-draft-field-coverage-1')
  async seedDraftFieldCoverage1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    const baseUrl = 'https://test-shop.myshopify.com';

    // Locked test strings for assertions
    const liveSeoTitle = 'Original Live SEO Title for DFC1 Testing';
    const liveSeoDescription = 'This is the original live SEO description for DFC1 testing.';
    const draftSeoTitle = 'Updated Draft SEO Title - DFC1 AI Generated';
    const draftSeoDescription = 'This is the new AI-generated draft SEO description for DFC1 testing.';

    // ========================================================================
    // PRODUCTS (3 scenarios)
    // ========================================================================

    // Product 1: Diff scenario - has live + different draft
    const productDiff = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'dfc1-product-diff',
        title: 'DFC1 Product With Diff',
        description: 'Product with live SEO and different draft values.',
        handle: 'dfc1-product-diff',
        seoTitle: liveSeoTitle,
        seoDescription: liveSeoDescription,
        lastSyncedAt: new Date(),
      },
    });

    // Product 2: Clear scenario - has live + explicitly cleared draft
    const productClear = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'dfc1-product-clear',
        title: 'DFC1 Product With Cleared Draft',
        description: 'Product with live SEO and explicitly cleared draft.',
        handle: 'dfc1-product-clear',
        seoTitle: 'Live Title That Will Be Cleared',
        seoDescription: 'This description will be cleared when the empty draft is applied.',
        lastSyncedAt: new Date(),
      },
    });

    // Product 3: No draft scenario - has live + empty raw/final
    const productNoDraft = await this.prisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'dfc1-product-no-draft',
        title: 'DFC1 Product No Draft Generated',
        description: 'Product with live SEO but no draft generated yet.',
        handle: 'dfc1-product-no-draft',
        seoTitle: 'Live Title With No Draft',
        seoDescription: 'This description has no corresponding draft generated.',
        lastSyncedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for products
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_title',
        scopeId: `project:${project.id}:products`,
        rulesHash: 'dfc1-products-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [productDiff.id, productClear.id, productNoDraft.id] as unknown as any,
        draftItems: [
          // Product 1: Diff scenario
          {
            productId: productDiff.id,
            field: 'seoTitle',
            rawSuggestion: draftSeoTitle,
            finalSuggestion: draftSeoTitle,
            ruleWarnings: [],
          },
          {
            productId: productDiff.id,
            field: 'seoDescription',
            rawSuggestion: draftSeoDescription,
            finalSuggestion: draftSeoDescription,
            ruleWarnings: [],
          },
          // Product 2: Explicitly cleared
          {
            productId: productClear.id,
            field: 'seoDescription',
            rawSuggestion: 'AI generated this but user cleared it',
            finalSuggestion: '', // Explicitly cleared
            ruleWarnings: [],
          },
          // Product 3: No draft generated yet (both empty)
          {
            productId: productNoDraft.id,
            field: 'seoTitle',
            rawSuggestion: '', // Empty - no draft generated
            finalSuggestion: '', // Empty - no draft generated
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 3,
          draftGenerated: 2,
          noSuggestionCount: 1,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // ========================================================================
    // PAGES (3 scenarios - static pages)
    // ========================================================================

    // Page 1: Diff scenario
    const pageDiff = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/dfc1-diff-page`,
        statusCode: 200,
        title: liveSeoTitle,
        metaDescription: liveSeoDescription,
        h1: 'DFC1 Diff Page',
        wordCount: 300,
        loadTimeMs: 200,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 2: Clear scenario
    const pageClear = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/dfc1-clear-page`,
        statusCode: 200,
        title: 'Page Title That Will Be Cleared',
        metaDescription: 'This description will be cleared when applied.',
        h1: 'DFC1 Clear Page',
        wordCount: 250,
        loadTimeMs: 180,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Page 3: No draft scenario
    const pageNoDraft = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/pages/dfc1-no-draft-page`,
        statusCode: 200,
        title: 'Page Title With No Draft',
        metaDescription: 'This description has no corresponding draft.',
        h1: 'DFC1 No Draft Page',
        wordCount: 200,
        loadTimeMs: 150,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for pages
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:pages`,
        rulesHash: 'dfc1-pages-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          // Page 1: Diff scenario
          {
            crawlResultId: pageDiff.id,
            field: 'seoTitle',
            rawSuggestion: draftSeoTitle,
            finalSuggestion: draftSeoTitle,
            ruleWarnings: [],
          },
          {
            crawlResultId: pageDiff.id,
            field: 'seoDescription',
            rawSuggestion: draftSeoDescription,
            finalSuggestion: draftSeoDescription,
            ruleWarnings: [],
          },
          // Page 2: Explicitly cleared
          {
            crawlResultId: pageClear.id,
            field: 'seoDescription',
            rawSuggestion: 'AI generated but cleared',
            finalSuggestion: '', // Explicitly cleared
            ruleWarnings: [],
          },
          // Page 3: No draft generated (both empty)
          {
            crawlResultId: pageNoDraft.id,
            field: 'seoTitle',
            rawSuggestion: '',
            finalSuggestion: '',
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 3,
          draftGenerated: 2,
          noSuggestionCount: 1,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    // ========================================================================
    // COLLECTIONS (3 scenarios)
    // ========================================================================

    // Collection 1: Diff scenario
    const collectionDiff = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/dfc1-diff-collection`,
        statusCode: 200,
        title: liveSeoTitle,
        metaDescription: liveSeoDescription,
        h1: 'DFC1 Diff Collection',
        wordCount: 350,
        loadTimeMs: 220,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 2: Clear scenario
    const collectionClear = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/dfc1-clear-collection`,
        statusCode: 200,
        title: 'Collection Title That Will Be Cleared',
        metaDescription: 'This description will be cleared when applied.',
        h1: 'DFC1 Clear Collection',
        wordCount: 280,
        loadTimeMs: 190,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Collection 3: No draft scenario
    const collectionNoDraft = await this.prisma.crawlResult.create({
      data: {
        projectId: project.id,
        url: `${baseUrl}/collections/dfc1-no-draft-collection`,
        statusCode: 200,
        title: 'Collection Title With No Draft',
        metaDescription: 'This description has no corresponding draft.',
        h1: 'DFC1 No Draft Collection',
        wordCount: 230,
        loadTimeMs: 170,
        issues: [],
        scannedAt: new Date(),
      },
    });

    // Create AutomationPlaybookDraft for collections
    await this.prisma.automationPlaybookDraft.create({
      data: {
        projectId: project.id,
        playbookId: 'missing_seo_description',
        scopeId: `project:${project.id}:collections`,
        rulesHash: 'dfc1-collections-hash',
        status: 'READY',
        createdByUserId: user.id,
        sampleProductIds: [] as unknown as any,
        draftItems: [
          // Collection 1: Diff scenario
          {
            crawlResultId: collectionDiff.id,
            field: 'seoTitle',
            rawSuggestion: draftSeoTitle,
            finalSuggestion: draftSeoTitle,
            ruleWarnings: [],
          },
          {
            crawlResultId: collectionDiff.id,
            field: 'seoDescription',
            rawSuggestion: draftSeoDescription,
            finalSuggestion: draftSeoDescription,
            ruleWarnings: [],
          },
          // Collection 2: Explicitly cleared
          {
            crawlResultId: collectionClear.id,
            field: 'seoDescription',
            rawSuggestion: 'AI generated but cleared',
            finalSuggestion: '', // Explicitly cleared
            ruleWarnings: [],
          },
          // Collection 3: No draft generated (both empty)
          {
            crawlResultId: collectionNoDraft.id,
            field: 'seoTitle',
            rawSuggestion: '',
            finalSuggestion: '',
            ruleWarnings: [],
          },
        ] as unknown as any,
        counts: {
          affectedTotal: 3,
          draftGenerated: 2,
          noSuggestionCount: 1,
        } as unknown as any,
        rules: { enabled: true } as unknown as any,
        appliedAt: null,
        expiresAt: null,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      projectId: project.id,
      accessToken,
      // Product IDs
      productDiffId: productDiff.id,
      productClearId: productClear.id,
      productNoDraftId: productNoDraft.id,
      // Page IDs
      pageDiffId: pageDiff.id,
      pageClearId: pageClear.id,
      pageNoDraftId: pageNoDraft.id,
      // Collection IDs
      collectionDiffId: collectionDiff.id,
      collectionClearId: collectionClear.id,
      collectionNoDraftId: collectionNoDraft.id,
      // Live/draft strings for assertions
      liveSeoTitle,
      liveSeoDescription,
      draftSeoTitle,
      draftSeoDescription,
      // Counts for reference
      counts: {
        affectedTotal: 3,
        draftGenerated: 2,
        noSuggestionCount: 1,
      },
    };
  }

  /**
   * POST /testkit/e2e/seed-playbook-entrypoint-integrity-1
   *
   * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Seed data for playbook entrypoint routing tests.
   *
   * Creates:
   * - Pro-plan user + project
   * - Products such that:
   *   - Titles playbook eligibleCount = 0 (all products have seoTitle)
   *   - Descriptions playbook eligibleCount > 0 (at least 1 product missing seoDescription)
   *
   * This setup verifies that the banner correctly shows "Preview missing SEO descriptions"
   * and clicking it routes to the descriptions playbook, not titles.
   *
   * Returns:
   * - user (id, email)
   * - projectId
   * - productIds[]
   * - accessToken
   */
  @Post('seed-playbook-entrypoint-integrity-1')
  async seedPlaybookEntrypointIntegrity1() {
    this.ensureE2eMode();

    const { user } = await createTestUser(this.prisma as any, {
      plan: 'pro',
    });

    const project = await createTestProject(this.prisma as any, {
      userId: user.id,
    });

    // Create products manually to control SEO field presence precisely:
    // - All products have seoTitle (titles eligibleCount = 0)
    // - Some products missing seoDescription (descriptions eligibleCount > 0)
    const products = await Promise.all([
      // Product 1: Has both title and description (not eligible for either)
      this.prisma.product.create({
        data: {
          projectId: project.id,
          externalId: `pepi1-ext-${Date.now()}-1`,
          title: 'Product With Full SEO',
          handle: 'product-with-full-seo',
          seoTitle: 'Complete SEO Title 1',
          seoDescription: 'Complete SEO Description 1',
        },
      }),
      // Product 2: Has title but no description (eligible for descriptions)
      this.prisma.product.create({
        data: {
          projectId: project.id,
          externalId: `pepi1-ext-${Date.now()}-2`,
          title: 'Product Missing Description',
          handle: 'product-missing-description',
          seoTitle: 'Has SEO Title 2',
          seoDescription: null, // Missing - eligible for descriptions playbook
        },
      }),
      // Product 3: Has title but no description (eligible for descriptions)
      this.prisma.product.create({
        data: {
          projectId: project.id,
          externalId: `pepi1-ext-${Date.now()}-3`,
          title: 'Another Product Missing Description',
          handle: 'another-product-missing-description',
          seoTitle: 'Has SEO Title 3',
          seoDescription: null, // Missing - eligible for descriptions playbook
        },
      }),
    ]);

    const accessToken = this.jwtService.sign({ sub: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      projectId: project.id,
      productIds: products.map((p) => p.id),
      accessToken,
      // Expected counts for test assertions
      expectedTitlesEligible: 0,
      expectedDescriptionsEligible: 2,
    };
  }

  // ==========================================================================
  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] E2E Mock Shopify Assets
  // ==========================================================================

  /**
   * POST /testkit/e2e/mock-shopify-assets
   *
   * Seed Shopify mock Pages and Collections for E2E sync coverage tests.
   * This stores data in the in-memory E2E Shopify mock store.
   * Tests must still trigger sync via the real endpoints to populate DB.
   *
   * Body:
   * - pages: Array of { id, title, handle, updatedAt, seo? }
   * - collections: Array of { id, title, handle, updatedAt, seo? }
   *
   * Returns:
   * - pagesSeeded: number
   * - collectionsSeeded: number
   */
  @Post('mock-shopify-assets')
  async mockShopifyAssets(
    @Body()
    body: {
      pages?: Array<{
        id: string;
        title: string;
        handle: string;
        updatedAt: string;
        seo?: { title: string | null; description: string | null };
      }>;
      collections?: Array<{
        id: string;
        title: string;
        handle: string;
        updatedAt: string;
        seo?: { title: string | null; description: string | null };
      }>;
    },
  ) {
    this.ensureE2eMode();

    // Dynamic import to avoid bundling in non-E2E builds
    const { e2eShopifyMockStore } = await import(
      '../shopify/e2e-shopify-mock.store'
    );

    // [SHOPIFY-ASSET-SYNC-COVERAGE-1-FIXUP-1] Reset store to prevent cross-test leakage
    // when only one of pages/collections is re-seeded
    e2eShopifyMockStore.reset();

    if (body.pages) {
      e2eShopifyMockStore.setPages(body.pages);
    }

    if (body.collections) {
      e2eShopifyMockStore.setCollections(body.collections);
    }

    return {
      pagesSeeded: body.pages?.length ?? 0,
      collectionsSeeded: body.collections?.length ?? 0,
    };
  }
}
