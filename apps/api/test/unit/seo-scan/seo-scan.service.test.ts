/**
 * Unit tests for SeoScanService
 *
 * Tests:
 * - startScan() starts scan with ownership validation
 * - startScan() uses Shopify domain when available
 * - startScan() uses project domain when no Shopify integration
 * - startScan() throws when no domain configured
 * - runFullProjectCrawl() runs crawl for project
 * - runFullProjectCrawl() returns null when project not found
 */
import { SeoScanService } from '../../../src/seo-scan/seo-scan.service';
import { PrismaService } from '../../../src/prisma.service';
import { DeoScoreService, DeoSignalsService } from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { IntegrationType } from '@prisma/client';

// Mock cheerio
const createMockCheerioElement = (text: string) => ({
  first: jest.fn(() => ({
    text: jest.fn(() => text),
  })),
  text: jest.fn(() => text),
  attr: jest.fn(() => text),
  replace: jest.fn(() => text),
  trim: jest.fn(() => text),
  split: jest.fn(() => text.split(/\s+/)),
  filter: jest.fn((fn: any) => text.split(/\s+/).filter(fn)),
});

const mockCheerio = jest.fn((selector: string) => {
  if (selector === 'title') {
    return createMockCheerioElement('Test Title');
  }
  if (selector === 'meta[name="description"]') {
    return {
      attr: jest.fn(() => 'Test Description'),
    };
  }
  if (selector === 'h1') {
    return createMockCheerioElement('Test H1');
  }
  if (selector === 'body') {
    return createMockCheerioElement('Test body content with multiple words for word count');
  }
  return createMockCheerioElement('');
});

jest.mock('cheerio', () => ({
  load: jest.fn(() => mockCheerio),
}));

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  crawlResult: {
    create: jest.fn(),
  },
});

const createDeoSignalsServiceMock = () => ({
  collectSignalsForProject: jest.fn(),
});

const createDeoScoreServiceMock = () => ({
  computeAndPersistScoreFromSignals: jest.fn(),
});

const createAutomationServiceMock = () => ({
  scheduleSuggestionsForProject: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('SeoScanService', () => {
  let service: SeoScanService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let deoSignalsServiceMock: ReturnType<typeof createDeoSignalsServiceMock>;
  let deoScoreServiceMock: ReturnType<typeof createDeoScoreServiceMock>;
  let automationServiceMock: ReturnType<typeof createAutomationServiceMock>;
  let roleResolutionServiceMock: ReturnType<typeof createRoleResolutionServiceMock>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    deoSignalsServiceMock = createDeoSignalsServiceMock();
    deoScoreServiceMock = createDeoScoreServiceMock();
    automationServiceMock = createAutomationServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    service = new SeoScanService(
      prismaMock as unknown as PrismaService,
      deoSignalsServiceMock as unknown as DeoSignalsService,
      deoScoreServiceMock as unknown as DeoScoreService,
      automationServiceMock as unknown as AutomationService,
      roleResolutionServiceMock as unknown as RoleResolutionService,
    );

    originalFetch = global.fetch;
    (global.fetch as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('startScan', () => {
    it('should start scan when project exists and user owns it', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        domain: 'example.com',
        integrations: [],
      };

      const mockCrawlResult = {
        id: 'crawl-1',
        projectId: 'proj-1',
        url: 'https://example.com/',
        statusCode: 200,
        title: 'Test Title',
        metaDescription: 'Test Description',
        h1: 'Test H1',
        wordCount: 100,
        loadTimeMs: 500,
        issues: [],
        scannedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><title>Test Title</title></head><body><h1>Test H1</h1></body></html>',
        headers: new Headers(),
      });
      prismaMock.crawlResult.create.mockResolvedValue(mockCrawlResult);
      prismaMock.project.update.mockResolvedValue({});

      const result = await service.startScan('proj-1', 'user-1');

      expect(result).toEqual(mockCrawlResult);
      expect(prismaMock.crawlResult.create).toHaveBeenCalled();
    });

    it('should use Shopify domain when available', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        domain: 'example.com',
        integrations: [
          {
            id: 'int-1',
            type: IntegrationType.SHOPIFY,
            externalId: 'shop.myshopify.com',
          },
        ],
      };

      const mockCrawlResult = {
        id: 'crawl-1',
        projectId: 'proj-1',
        url: 'https://shop.myshopify.com/',
        scannedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html></html>',
        headers: new Headers(),
      });
      prismaMock.crawlResult.create.mockResolvedValue(mockCrawlResult);
      prismaMock.project.update.mockResolvedValue({});

      await service.startScan('proj-1', 'user-1');

      expect(prismaMock.crawlResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'https://shop.myshopify.com/',
        }),
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.startScan('proj-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
        domain: 'example.com',
        integrations: [],
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      roleResolutionServiceMock.assertOwnerRole.mockRejectedValue(
        new ForbiddenException('You do not have access to this project'),
      );

      await expect(service.startScan('proj-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when no domain configured', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        domain: null,
        integrations: [],
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.startScan('proj-1', 'user-1')).rejects.toThrow(NotFoundException);
      await expect(service.startScan('proj-1', 'user-1')).rejects.toThrow(
        'No domain configured',
      );
    });
  });

  describe('runFullProjectCrawl', () => {
    it('should run crawl for project', async () => {
      const mockProject = {
        id: 'proj-1',
        domain: 'example.com',
        integrations: [],
      };

      const crawledAt = new Date();

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html></html>',
        headers: new Headers(),
      });
      prismaMock.crawlResult.create.mockResolvedValue({
        id: 'crawl-1',
        scannedAt: crawledAt,
      });

      const result = await service.runFullProjectCrawl('proj-1');

      expect(result).toEqual(crawledAt);
    });

    it('should return null when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.runFullProjectCrawl('proj-1');

      expect(result).toBeNull();

      (console.warn as jest.Mock).mockRestore();
    });
  });
});

