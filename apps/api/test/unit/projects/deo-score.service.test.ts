/**
 * Unit tests for DeoScoreService
 *
 * Tests:
 * - getLatestForProject() returns latest score snapshot
 * - getLatestForProject() returns null when no snapshot exists
 * - getLatestForProject() validates project ownership
 * - computeAndPersistScoreFromSignals() computes and persists score
 */
import { DeoScoreService } from '../../../src/projects/deo-score.service';
import { PrismaService } from '../../../src/prisma.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeoScoreSignals } from '@engineo/shared';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  deoScoreSnapshot: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('DeoScoreService', () => {
  let service: DeoScoreService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionServiceMock: ReturnType<typeof createRoleResolutionServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();
    service = new DeoScoreService(
      prismaMock as unknown as PrismaService,
      roleResolutionServiceMock as unknown as RoleResolutionService,
    );
  });

  describe('getLatestForProject', () => {
    it('should return latest score snapshot when it exists', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        projectId: 'proj-1',
        version: 'v1',
        overallScore: 75,
        contentScore: 80,
        entityScore: 70,
        technicalScore: 75,
        visibilityScore: 80,
        computedAt: new Date('2024-01-01'),
        metadata: null,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.deoScoreSnapshot.findFirst.mockResolvedValue(mockSnapshot);

      const result = await service.getLatestForProject('proj-1', 'user-1');

      expect(result).toHaveProperty('projectId', 'proj-1');
      expect(result).toHaveProperty('latestScore');
      expect(result).toHaveProperty('latestSnapshot');
      expect(result.latestScore).toEqual({
        overall: 75,
        content: 80,
        entities: 70,
        technical: 75,
        visibility: 80,
      });
      expect(result.latestSnapshot?.id).toBe('snapshot-1');
    });

    it('should return null when no snapshot exists', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.deoScoreSnapshot.findFirst.mockResolvedValue(null);

      const result = await service.getLatestForProject('proj-1', 'user-1');

      expect(result).toHaveProperty('projectId', 'proj-1');
      expect(result.latestScore).toBeNull();
      expect(result.latestSnapshot).toBeNull();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getLatestForProject('proj-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project'),
      );

      await expect(service.getLatestForProject('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('computeAndPersistScoreFromSignals', () => {
    it('should compute and persist score from signals', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockSignals: DeoScoreSignals = {
        content: {
          totalPages: 10,
          pagesWithMetadata: 8,
          avgWordCount: 500,
          pagesWithThinContent: 2,
        },
        entities: {
          totalProducts: 20,
          productsWithAnswerBlocks: 15,
          answerabilityScore: 75,
        },
        technical: {
          crawlablePages: 10,
          indexablePages: 9,
          avgLoadTime: 1.5,
        },
        visibility: {
          offsitePresenceScore: 60,
          localDiscoveryScore: null,
        },
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        projectId: 'proj-1',
        version: 'v1',
        overallScore: 70,
        contentScore: 75,
        entityScore: 70,
        technicalScore: 80,
        visibilityScore: 60,
        computedAt: new Date(),
        metadata: {},
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.deoScoreSnapshot.create.mockResolvedValue(mockSnapshot);

      const result = await service.computeAndPersistScoreFromSignals('proj-1', mockSignals);

      expect(result).toHaveProperty('id', 'snapshot-1');
      expect(result).toHaveProperty('projectId', 'proj-1');
      expect(prismaMock.deoScoreSnapshot.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const mockSignals: DeoScoreSignals = {
        content: { totalPages: 10, pagesWithMetadata: 8, avgWordCount: 500, pagesWithThinContent: 2 },
        entities: { totalProducts: 20, productsWithAnswerBlocks: 15, answerabilityScore: 75 },
        technical: { crawlablePages: 10, indexablePages: 9, avgLoadTime: 1.5 },
        visibility: { offsitePresenceScore: 60, localDiscoveryScore: null },
      };

      await expect(
        service.computeAndPersistScoreFromSignals('proj-1', mockSignals),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

