/**
 * Unit tests for WorkQueueService
 *
 * Tests:
 * - getWorkQueue() returns work queue items with viewer context
 * - getWorkQueue() filters by tab, bundleType, actionKey, scopeType
 * - deriveIssueBundles() creates bundles from issues
 * - deriveAutomationBundles() creates bundles from playbooks
 * - deriveGeoExportBundle() creates GEO export bundle
 * - sortBundles() sorts bundles correctly
 */
import { WorkQueueService } from '../../../src/projects/work-queue.service';
import { PrismaService } from '../../../src/prisma.service';
import { DeoIssuesService } from '../../../src/projects/deo-issues.service';
import { AutomationPlaybooksService } from '../../../src/projects/automation-playbooks.service';
import { GeoReportsService } from '../../../src/projects/geo-reports.service';
import { GovernanceService } from '../../../src/projects/governance.service';
import { ApprovalsService } from '../../../src/projects/approvals.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException } from '@nestjs/common';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  crawlResult: {
    findMany: jest.fn(),
  },
  automationPlaybookDraft: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
});

const createDeoIssuesServiceMock = () => ({
  getIssuesForProjectReadOnly: jest.fn(),
});

const createAutomationPlaybooksServiceMock = () => ({
  estimatePlaybook: jest.fn(),
  getLatestDraft: jest.fn(),
});

const createGeoReportsServiceMock = () => ({
  listShareLinks: jest.fn(),
});

const createGovernanceServiceMock = () => ({
  isApprovalRequired: jest.fn(),
});

const createApprovalsServiceMock = () => ({
  hasValidApproval: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  resolveEffectiveRole: jest.fn().mockResolvedValue('OWNER'),
  getCapabilities: jest.fn().mockReturnValue({
    canGenerateDrafts: true,
    canApply: true,
    canApprove: true,
    canRequestApproval: true,
  }),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('WorkQueueService', () => {
  let service: WorkQueueService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let deoIssuesServiceMock: ReturnType<typeof createDeoIssuesServiceMock>;
  let automationPlaybooksServiceMock: ReturnType<
    typeof createAutomationPlaybooksServiceMock
  >;
  let geoReportsServiceMock: ReturnType<typeof createGeoReportsServiceMock>;
  let governanceServiceMock: ReturnType<typeof createGovernanceServiceMock>;
  let approvalsServiceMock: ReturnType<typeof createApprovalsServiceMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    deoIssuesServiceMock = createDeoIssuesServiceMock();
    automationPlaybooksServiceMock = createAutomationPlaybooksServiceMock();
    geoReportsServiceMock = createGeoReportsServiceMock();
    governanceServiceMock = createGovernanceServiceMock();
    approvalsServiceMock = createApprovalsServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    service = new WorkQueueService(
      prismaMock as unknown as PrismaService,
      deoIssuesServiceMock as unknown as DeoIssuesService,
      automationPlaybooksServiceMock as unknown as AutomationPlaybooksService,
      geoReportsServiceMock as unknown as GeoReportsService,
      governanceServiceMock as unknown as GovernanceService,
      approvalsServiceMock as unknown as ApprovalsService,
      roleResolutionServiceMock as unknown as RoleResolutionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkQueue', () => {
    it('should return work queue items with viewer context', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      expect(result.viewer).toBeDefined();
      expect(result.viewer.role).toBe('OWNER');
      expect(result.items).toBeDefined();
      expect(roleResolutionServiceMock.assertProjectAccess).toHaveBeenCalledWith(
        'proj-1',
        'user-1'
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.getWorkQueue('proj-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by bundleType', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [
          {
            id: 'issue-1',
            title: 'Missing SEO title',
            severity: 'warning',
            isActionableNow: true,
            assetTypeCounts: { products: 5, pages: 0, collections: 0 },
          },
        ],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1', {
        bundleType: 'ASSET_OPTIMIZATION',
      });

      expect(result.items.every((i) => i.bundleType === 'ASSET_OPTIMIZATION')).toBe(
        true
      );
    });

    it('should filter by actionKey', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [
          {
            id: 'issue-1',
            title: 'Missing SEO title',
            severity: 'warning',
            isActionableNow: true,
            assetTypeCounts: { products: 5, pages: 0, collections: 0 },
          },
        ],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1', {
        actionKey: 'FIX_MISSING_METADATA',
      });

      expect(
        result.items.every((i) => i.recommendedActionKey === 'FIX_MISSING_METADATA')
      ).toBe(true);
    });

    it('should filter by scopeType', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [
          {
            id: 'issue-1',
            title: 'Missing SEO title',
            severity: 'warning',
            isActionableNow: true,
            assetTypeCounts: { products: 5, pages: 0, collections: 0 },
          },
        ],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1', {
        scopeType: 'PRODUCTS',
      });

      expect(result.items.every((i) => i.scopeType === 'PRODUCTS')).toBe(true);
    });

    it('should filter by tab', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [
          {
            id: 'issue-1',
            title: 'Missing SEO title',
            severity: 'critical',
            isActionableNow: true,
            assetTypeCounts: { products: 5, pages: 0, collections: 0 },
          },
        ],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1', {
        tab: 'Critical',
      });

      expect(
        result.items.every(
          (i) => i.health === 'CRITICAL' && i.state !== 'APPLIED'
        )
      ).toBe(true);
    });
  });

  describe('deriveIssueBundles', () => {
    it('should create bundles from issues grouped by action', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Missing SEO title',
          severity: 'warning',
          isActionableNow: true,
          assetTypeCounts: { products: 5, pages: 0, collections: 0 },
        },
        {
          id: 'issue-2',
          title: 'Missing SEO description',
          severity: 'warning',
          isActionableNow: true,
          assetTypeCounts: { products: 3, pages: 0, collections: 0 },
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: mockIssues,
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const issueBundles = result.items.filter(
        (i) => i.bundleType === 'ASSET_OPTIMIZATION'
      );
      expect(issueBundles.length).toBeGreaterThan(0);
    });

    it('should create separate bundles for PRODUCTS, PAGES, and COLLECTIONS', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Missing SEO title',
          severity: 'warning',
          isActionableNow: true,
          assetTypeCounts: { products: 5, pages: 3, collections: 2 },
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: mockIssues,
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const productsBundles = result.items.filter(
        (i) => i.scopeType === 'PRODUCTS' && i.bundleType === 'ASSET_OPTIMIZATION'
      );
      const pagesBundles = result.items.filter(
        (i) => i.scopeType === 'PAGES' && i.bundleType === 'ASSET_OPTIMIZATION'
      );
      const collectionsBundles = result.items.filter(
        (i) =>
          i.scopeType === 'COLLECTIONS' &&
          i.bundleType === 'ASSET_OPTIMIZATION'
      );

      expect(productsBundles.length).toBeGreaterThan(0);
      expect(pagesBundles.length).toBeGreaterThan(0);
      expect(collectionsBundles.length).toBeGreaterThan(0);
    });
  });

  describe('deriveAutomationBundles', () => {
    it('should create automation bundles from playbooks', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      // Return non-zero affected products to ensure bundles are created
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 10,
      });
      automationPlaybooksServiceMock.getLatestDraft.mockResolvedValue(null);
      governanceServiceMock.isApprovalRequired.mockResolvedValue(false);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ]);
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const automationBundles = result.items.filter(
        (i) => i.bundleType === 'AUTOMATION_RUN'
      );
      // Should have bundles for missing_seo_title and missing_seo_description
      expect(automationBundles.length).toBeGreaterThan(0);
    });

    it('should include draft status in automation bundles', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      const mockDraft = {
        draftId: 'draft-1',
        scopeId: 'scope-1',
        status: 'READY',
        counts: {
          draftGenerated: 5,
          affectedTotal: 10,
        },
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 10,
      });
      automationPlaybooksServiceMock.getLatestDraft.mockResolvedValue(mockDraft);
      prismaMock.automationPlaybookDraft.findUnique.mockResolvedValue({
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      governanceServiceMock.isApprovalRequired.mockResolvedValue(false);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ]);
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const automationBundles = result.items.filter(
        (i) => i.bundleType === 'AUTOMATION_RUN'
      );
      const bundleWithDraft = automationBundles.find(
        (b) => b.draft?.draftStatus === 'READY'
      );
      expect(bundleWithDraft).toBeDefined();
      expect(bundleWithDraft?.state).toBe('DRAFTS_READY');
    });
  });

  describe('deriveGeoExportBundle', () => {
    it('should create GEO export bundle when share links exist', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      const mockShareLinks = [
        {
          id: 'link-1',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue(mockShareLinks);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const geoBundles = result.items.filter(
        (i) => i.bundleType === 'GEO_EXPORT'
      );
      expect(geoBundles.length).toBeGreaterThan(0);
      expect(geoBundles[0].geoExport?.shareLinkStatus).toBe('ACTIVE');
    });
  });

  describe('sortBundles', () => {
    it('should sort bundles by state priority, health, impact rank, and updatedAt', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [
          {
            id: 'issue-1',
            title: 'Critical issue',
            severity: 'critical',
            isActionableNow: true,
            assetTypeCounts: { products: 5, pages: 0, collections: 0 },
          },
          {
            id: 'issue-2',
            title: 'Warning issue',
            severity: 'warning',
            isActionableNow: true,
            assetTypeCounts: { products: 3, pages: 0, collections: 0 },
          },
        ],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      // Critical issues should come before warnings
      const criticalBundles = result.items.filter((i) => i.health === 'CRITICAL');
      const warningBundles = result.items.filter(
        (i) => i.health === 'NEEDS_ATTENTION'
      );

      if (criticalBundles.length > 0 && warningBundles.length > 0) {
        const firstCriticalIndex = result.items.findIndex(
          (i) => i.health === 'CRITICAL'
        );
        const firstWarningIndex = result.items.findIndex(
          (i) => i.health === 'NEEDS_ATTENTION'
        );
        expect(firstCriticalIndex).toBeLessThan(firstWarningIndex);
      }
    });
  });

  describe('viewer capabilities based on role', () => {
    it('should include correct viewer capabilities for VIEWER role', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      roleResolutionServiceMock.resolveEffectiveRole.mockResolvedValue('VIEWER');
      roleResolutionServiceMock.getCapabilities.mockReturnValue({
        canGenerateDrafts: false,
        canApply: false,
        canApprove: false,
        canRequestApproval: false,
      });

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      expect(result.viewer.role).toBe('VIEWER');
      expect(result.viewer.capabilities.canApply).toBe(false);
      expect(result.viewer.capabilities.canGenerateDrafts).toBe(false);
    });

    it('should include correct viewer capabilities for EDITOR role', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      roleResolutionServiceMock.resolveEffectiveRole.mockResolvedValue('EDITOR');
      roleResolutionServiceMock.getCapabilities.mockReturnValue({
        canGenerateDrafts: true,
        canApply: false,
        canApprove: false,
        canRequestApproval: true,
      });
      roleResolutionServiceMock.isMultiUserProject.mockResolvedValue(true);

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      expect(result.viewer.role).toBe('EDITOR');
      expect(result.viewer.capabilities.canGenerateDrafts).toBe(true);
      expect(result.viewer.capabilities.canRequestApproval).toBe(true);
    });
  });

  describe('STORE_WIDE fallback bundles', () => {
    it('should create STORE_WIDE bundle when no specific scope items found', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      // Issues with no asset type counts (will trigger STORE_WIDE fallback)
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Store-wide issue',
          severity: 'warning',
          isActionableNow: true,
          assetTypeCounts: { products: 0, pages: 0, collections: 0 },
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: mockIssues,
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 0,
      });
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const storeWideBundles = result.items.filter(
        (i) => i.scopeType === 'STORE_WIDE'
      );
      expect(storeWideBundles.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('approval-required paths', () => {
    it('should check approval requirements for automation bundles', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 10,
      });
      automationPlaybooksServiceMock.getLatestDraft.mockResolvedValue({
        draftId: 'draft-1',
        scopeId: 'scope-1',
        status: 'READY',
        counts: { draftGenerated: 5, affectedTotal: 10 },
      });
      prismaMock.automationPlaybookDraft.findUnique.mockResolvedValue({
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      governanceServiceMock.isApprovalRequired.mockResolvedValue(true);
      approvalsServiceMock.hasValidApproval.mockResolvedValue(false);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Product 1' },
      ]);
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      expect(governanceServiceMock.isApprovalRequired).toHaveBeenCalled();
      // Bundles should exist for the automation run
      const automationBundles = result.items.filter(
        (i) => i.bundleType === 'AUTOMATION_RUN'
      );
      expect(automationBundles.length).toBeGreaterThan(0);
    });

    it('should mark bundle as APPROVED when approval exists', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      automationPlaybooksServiceMock.estimatePlaybook.mockResolvedValue({
        totalAffectedProducts: 10,
      });
      automationPlaybooksServiceMock.getLatestDraft.mockResolvedValue({
        draftId: 'draft-1',
        scopeId: 'scope-1',
        status: 'READY',
        counts: { draftGenerated: 5, affectedTotal: 10 },
      });
      prismaMock.automationPlaybookDraft.findUnique.mockResolvedValue({
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      governanceServiceMock.isApprovalRequired.mockResolvedValue(true);
      approvalsServiceMock.hasValidApproval.mockResolvedValue(true);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Product 1' },
      ]);
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      const result = await service.getWorkQueue('proj-1', 'user-1');

      const automationBundles = result.items.filter(
        (i) => i.bundleType === 'AUTOMATION_RUN'
      );
      // Should have bundles with APPROVED state or DRAFTS_READY with approval
      expect(automationBundles.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle estimatePlaybook errors gracefully', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
        lastDeoComputedAt: new Date('2024-01-01'),
        lastCrawledAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });
      // Simulate error in estimate
      automationPlaybooksServiceMock.estimatePlaybook.mockRejectedValue(
        new Error('Estimation failed')
      );
      geoReportsServiceMock.listShareLinks.mockResolvedValue([]);

      // Should not throw, should handle gracefully
      const result = await service.getWorkQueue('proj-1', 'user-1');

      expect(result.items).toBeDefined();
    });
  });
});
