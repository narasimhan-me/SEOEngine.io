/**
 * AUTO-PB-1.3: Integration test confirming that applyPlaybook does NOT
 * call AI services. Apply must use the pre-generated draft suggestions.
 *
 * This test directly invokes the service method to verify the "no AI at Apply"
 * contract at the unit/integration level.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AutomationPlaybooksService } from '../../src/projects/automation-playbooks.service';
import { PrismaService } from '../../src/prisma.service';
import { AiService } from '../../src/ai/ai.service';
import { EntitlementsService } from '../../src/billing/entitlements.service';
import { ProjectsService } from '../../src/projects/projects.service';
import { ProductIssueFixService } from '../../src/ai/product-issue-fix.service';
import { TokenUsageService } from '../../src/ai/token-usage.service';
import { AiUsageQuotaService } from '../../src/ai/ai-usage-quota.service';
import { RoleResolutionService } from '../../src/common/role-resolution.service';
import { AutomationSafetyRailsService } from '../../src/projects/automation-safety-rails.service';

describe('AutomationPlaybooksService.applyPlaybook – no AI contract', () => {
  let service: AutomationPlaybooksService;
  let module: TestingModule;
  let aiServiceMock: { generateMetadata: jest.Mock };

  beforeAll(async () => {
    aiServiceMock = {
      generateMetadata: jest.fn().mockResolvedValue({
        seoTitle: 'AI Generated Title',
        seoDescription: 'AI Generated Description',
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        AutomationPlaybooksService,
        {
          provide: PrismaService,
          useValue: {
            // Minimal mock – the test focuses on AI call tracking
            product: { findMany: jest.fn().mockResolvedValue([]) },
            automationPlaybookDraft: {
              findFirst: jest.fn().mockResolvedValue(null),
              findUnique: jest.fn().mockResolvedValue(null),
              upsert: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: AiService,
          useValue: aiServiceMock,
        },
        {
          provide: EntitlementsService,
          useValue: {
            enforceEntitlement: jest.fn().mockResolvedValue(undefined),
            getEffectivePlanId: jest.fn().mockResolvedValue('pro'),
            getDailyAiUsage: jest
              .fn()
              .mockResolvedValue({ used: 0, limit: 100 }),
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            getProject: jest
              .fn()
              .mockResolvedValue({ id: 'test-project', name: 'Test' }),
          },
        },
        {
          provide: ProductIssueFixService,
          useValue: {
            fixMissingSeoFieldFromIssue: jest
              .fn()
              .mockResolvedValue({ updated: true }),
          },
        },
        {
          provide: TokenUsageService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            getMonthlyUsage: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: AiUsageQuotaService,
          useValue: {
            evaluateQuotaForAction: jest.fn().mockResolvedValue({
              projectId: 'test-project',
              planId: 'pro',
              action: 'PREVIEW_GENERATE',
              policy: {
                monthlyAiRunsLimit: null,
                softThresholdPercent: 80,
                hardEnforcementEnabled: false,
              },
              currentMonthAiRuns: 0,
              remainingAiRuns: null,
              currentUsagePercent: null,
              status: 'allowed',
              reason: 'unlimited',
            }),
          },
        },
        {
          provide: RoleResolutionService,
          useValue: {
            assertProjectAccess: jest.fn().mockResolvedValue(undefined),
            assertCanGenerateDrafts: jest.fn().mockResolvedValue(undefined),
            assertOwnerRole: jest.fn().mockResolvedValue(undefined),
            canApply: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AutomationSafetyRailsService,
          useValue: {
            evaluateSafetyRails: jest.fn().mockResolvedValue({
              status: 'PASSED',
              checks: [],
              evaluatedAt: new Date().toISOString(),
              projectId: 'project-456',
              userId: 'user-123',
              automationId: 'missing_seo_title',
              declaredScope: {
                scopeId: 'scope-abc',
                assetCount: 1,
                assetType: 'product',
              },
            }),
            enforceOrBlock: jest.fn().mockResolvedValue({
              status: 'PASSED',
              checks: [],
              evaluatedAt: new Date().toISOString(),
              projectId: 'project-456',
              userId: 'user-123',
              automationId: 'missing_seo_title',
              declaredScope: {
                scopeId: 'scope-abc',
                assetCount: 1,
                assetType: 'product',
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AutomationPlaybooksService>(
      AutomationPlaybooksService
    );
  });

  beforeEach(() => {
    aiServiceMock.generateMetadata.mockClear();
  });

  it('applyPlaybook must NOT call AiService.generateMetadata', async () => {
    // This test verifies the architectural contract: Apply reads from the draft,
    // it should never invoke AI. Even if the method throws (due to missing draft),
    // we only care that AI was never called.

    try {
      await service.applyPlaybook(
        'user-123',
        'project-456',
        'missing_seo_title',
        'scope-abc',
        'rules-hash-xyz'
      );
    } catch {
      // Expected – the mock doesn't have a real draft
    }

    // The critical assertion: AI should NOT have been called
    expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();
  });

  it('[EA-18] APPLY-ACTION-GOVERNANCE-1: applyPlaybook enforces OWNER role via assertOwnerRole', async () => {
    // [EA-18] This test verifies the governance contract: Apply requires OWNER role.
    // RoleResolutionService.assertOwnerRole must be called before any apply logic executes.
    const roleServiceMock = module.get(RoleResolutionService) as any;
    const assertOwnerRoleSpy = jest.spyOn(roleServiceMock, 'assertOwnerRole');

    try {
      await service.applyPlaybook(
        'user-123',
        'project-456',
        'missing_seo_title',
        'scope-abc',
        'rules-hash-xyz'
      );
    } catch {
      // Expected to fail due to missing draft or other validation
    }

    // [EA-18] GOVERNANCE SIGNAL: Verify that assertOwnerRole was called with correct parameters
    expect(assertOwnerRoleSpy).toHaveBeenCalledWith('project-456', 'user-123');
  });
});
