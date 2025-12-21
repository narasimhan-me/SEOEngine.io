/**
 * Unit tests for ProjectsService
 *
 * Tests:
 * - getProjectsForUser() returns user's projects
 * - getProject() returns project with ownership validation
 * - createProject() creates new project
 * - updateProject() updates project fields
 * - deleteProject() deletes project and related data
 * - validateProjectOwnership() checks ownership
 */
import { ProjectsService } from '../../../src/projects/projects.service';
import { PrismaService } from '../../../src/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CrawlFrequency } from '@prisma/client';

const createPrismaMock = () => ({
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  integration: {
    deleteMany: jest.fn(),
  },
  product: {
    deleteMany: jest.fn(),
  },
  crawlResult: {
    deleteMany: jest.fn(),
  },
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new ProjectsService(prismaMock as unknown as PrismaService);
  });

  describe('getProjectsForUser', () => {
    it('should return projects for user ordered by creation date', async () => {
      const mockProjects = [
        {
          id: 'proj-2',
          userId: 'user-1',
          name: 'Project 2',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'proj-1',
          userId: 'user-1',
          name: 'Project 1',
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.getProjectsForUser('user-1');

      expect(result).toEqual(mockProjects);
      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getProject', () => {
    it('should return project when user owns it', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
        domain: 'example.com',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProject('proj-1', 'user-1');

      expect(result).toEqual(mockProject);
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getProject('proj-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
        name: 'Test Project',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.getProject('proj-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createProject', () => {
    it('should create project with name and domain', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'New Project',
        domain: 'example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.project.create.mockResolvedValue(mockProject);

      const result = await service.createProject('user-1', {
        name: 'New Project',
        domain: 'example.com',
      });

      expect(result).toEqual(mockProject);
      expect(prismaMock.project.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'New Project',
          domain: 'example.com',
        },
      });
    });

    it('should create project with name only', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'New Project',
        domain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.project.create.mockResolvedValue(mockProject);

      const result = await service.createProject('user-1', {
        name: 'New Project',
      });

      expect(result).toEqual(mockProject);
    });
  });

  describe('updateProject', () => {
    it('should update project name', async () => {
      const existingProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Old Name',
      };

      const updatedProject = {
        ...existingProject,
        name: 'New Name',
      };

      prismaMock.project.findUnique.mockResolvedValue(existingProject);
      prismaMock.project.update.mockResolvedValue(updatedProject);

      const result = await service.updateProject('proj-1', 'user-1', {
        name: 'New Name',
      });

      expect(result).toEqual(updatedProject);
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: {
          name: 'New Name',
        },
      });
    });

    it('should update crawlFrequency', async () => {
      const existingProject = {
        id: 'proj-1',
        userId: 'user-1',
        crawlFrequency: CrawlFrequency.WEEKLY,
      };

      prismaMock.project.findUnique.mockResolvedValue(existingProject);
      prismaMock.project.update.mockResolvedValue({
        ...existingProject,
        crawlFrequency: CrawlFrequency.DAILY,
      });

      const result = await service.updateProject('proj-1', 'user-1', {
        crawlFrequency: CrawlFrequency.DAILY,
      });

      expect(result.crawlFrequency).toBe(CrawlFrequency.DAILY);
    });

    it('should throw BadRequestException for invalid crawlFrequency', async () => {
      const existingProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(existingProject);

      await expect(
        service.updateProject('proj-1', 'user-1', {
          crawlFrequency: 'INVALID' as CrawlFrequency,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update multiple fields', async () => {
      const existingProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Old Name',
        domain: 'old.com',
        autoCrawlEnabled: false,
      };

      prismaMock.project.findUnique.mockResolvedValue(existingProject);
      prismaMock.project.update.mockResolvedValue({
        ...existingProject,
        name: 'New Name',
        domain: 'new.com',
        autoCrawlEnabled: true,
      });

      const result = await service.updateProject('proj-1', 'user-1', {
        name: 'New Name',
        domain: 'new.com',
        autoCrawlEnabled: true,
      });

      expect(result.name).toBe('New Name');
      expect(result.domain).toBe('new.com');
      expect(result.autoCrawlEnabled).toBe(true);
    });
  });

  describe('deleteProject', () => {
    it('should delete project and related data', async () => {
      const existingProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(existingProject);
      prismaMock.integration.deleteMany.mockResolvedValue({ count: 2 });
      prismaMock.product.deleteMany.mockResolvedValue({ count: 5 });
      prismaMock.crawlResult.deleteMany.mockResolvedValue({ count: 10 });
      prismaMock.project.delete.mockResolvedValue(existingProject);

      const result = await service.deleteProject('proj-1', 'user-1');

      expect(result).toEqual(existingProject);
      expect(prismaMock.integration.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
      expect(prismaMock.product.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
      expect(prismaMock.crawlResult.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
      expect(prismaMock.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });
  });

  describe('validateProjectOwnership', () => {
    it('should return true when user owns project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.validateProjectOwnership('proj-1', 'user-1');

      expect(result).toBe(true);
      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'proj-1',
          userId: 'user-1',
        },
      });
    });

    it('should return false when user does not own project', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null);

      const result = await service.validateProjectOwnership('proj-1', 'user-1');

      expect(result).toBe(false);
    });
  });
});

