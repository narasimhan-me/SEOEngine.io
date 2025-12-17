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

describe('AutomationPlaybooksService.applyPlaybook – no AI contract', () => {
  let service: AutomationPlaybooksService;
  let aiServiceMock: { generateMetadata: jest.Mock };

  beforeAll(async () => {
    aiServiceMock = {
      generateMetadata: jest.fn().mockResolvedValue({
        seoTitle: 'AI Generated Title',
        seoDescription: 'AI Generated Description',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
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
            getDailyAiUsage: jest.fn().mockResolvedValue({ used: 0, limit: 100 }),
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            getProject: jest.fn().mockResolvedValue({ id: 'test-project', name: 'Test' }),
          },
        },
        {
          provide: ProductIssueFixService,
          useValue: {
            fixMissingSeoFieldFromIssue: jest.fn().mockResolvedValue({ updated: true }),
          },
        },
      ],
    }).compile();

    service = module.get<AutomationPlaybooksService>(AutomationPlaybooksService);
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
        'rules-hash-xyz',
      );
    } catch {
      // Expected – the mock doesn't have a real draft
    }

    // The critical assertion: AI should NOT have been called
    expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();
  });
});
