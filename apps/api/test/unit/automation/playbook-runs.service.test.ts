/**
 * RUNS-1: Unit tests for AutomationPlaybookRunsService
 *
 * Tests:
 * - IdempotencyKey de-dup: same key returns same run, no duplicate DB record.
 * - Rerun semantics: different idempotency key creates new run.
 * - Status transitions via inline execution.
 * - Stale detection for known contract errors.
 */
import { AutomationPlaybookRunsService, AutomationPlaybookRunType } from '../../../src/projects/automation-playbook-runs.service';
import { AutomationPlaybookRunProcessor } from '../../../src/projects/automation-playbook-run.processor';

// Mock the queue to simulate dev mode (no Redis)
jest.mock('../../../src/queues/queues', () => ({
  playbookRunQueue: null,
}));

// Minimal mock factory
const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  automationPlaybookRun: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('AutomationPlaybookRunsService', () => {
  let service: AutomationPlaybookRunsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let processorMock: { processJob: jest.Mock };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    processorMock = { processJob: jest.fn() };

    // Construct service directly with mocks
    service = new AutomationPlaybookRunsService(
      prismaMock as any,
      processorMock as any,
    );
  });

  describe('createRun', () => {
    const baseOptions = {
      userId: 'user-1',
      projectId: 'proj-1',
      playbookId: 'missing_seo_title' as const,
      runType: 'PREVIEW_GENERATE' as AutomationPlaybookRunType,
      scopeId: 'scope-abc',
      rulesHash: 'rules-xyz',
    };

    beforeEach(() => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
      });
    });

    it('should create a new run when no existing run matches', async () => {
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(null);
      const newRun = {
        id: 'run-1',
        ...baseOptions,
        status: 'QUEUED',
        idempotencyKey: `${baseOptions.runType}:${baseOptions.projectId}:${baseOptions.playbookId}:${baseOptions.scopeId}:${baseOptions.rulesHash}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.automationPlaybookRun.create.mockResolvedValue(newRun);

      const result = await service.createRun(baseOptions);

      expect(result.id).toBe('run-1');
      expect(result.status).toBe('QUEUED');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);
    });

    it('should return existing run when idempotency key matches and status is QUEUED', async () => {
      const existingRun = {
        id: 'run-existing',
        ...baseOptions,
        status: 'QUEUED',
        idempotencyKey: 'custom-key',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(existingRun);

      const result = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'custom-key',
      });

      expect(result.id).toBe('run-existing');
      expect(prismaMock.automationPlaybookRun.create).not.toHaveBeenCalled();
    });

    it('should return existing run when status is SUCCEEDED', async () => {
      const existingRun = {
        id: 'run-succeeded',
        ...baseOptions,
        status: 'SUCCEEDED',
        idempotencyKey: 'key-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(existingRun);

      const result = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'key-1',
      });

      expect(result.id).toBe('run-succeeded');
      expect(prismaMock.automationPlaybookRun.create).not.toHaveBeenCalled();
    });

    it('should create new run when different idempotency key is provided', async () => {
      // First call with key-1
      const existingRun = {
        id: 'run-1',
        ...baseOptions,
        status: 'SUCCEEDED',
        idempotencyKey: 'key-1',
      };
      prismaMock.automationPlaybookRun.findFirst
        .mockResolvedValueOnce(existingRun) // First createRun returns existing
        .mockResolvedValueOnce(null); // Second createRun with different key finds nothing

      const newRun = {
        id: 'run-2',
        ...baseOptions,
        status: 'QUEUED',
        idempotencyKey: 'key-2',
      };
      prismaMock.automationPlaybookRun.create.mockResolvedValue(newRun);

      // First call returns existing
      const result1 = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'key-1',
      });
      expect(result1.id).toBe('run-1');

      // Second call with different key creates new
      const result2 = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'key-2',
      });
      expect(result2.id).toBe('run-2');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);
    });

    it('should create new run when existing run has FAILED status', async () => {
      const existingRun = {
        id: 'run-failed',
        ...baseOptions,
        status: 'FAILED',
        idempotencyKey: 'key-1',
      };
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(existingRun);

      const newRun = {
        id: 'run-new',
        ...baseOptions,
        status: 'QUEUED',
        idempotencyKey: 'key-1',
      };
      prismaMock.automationPlaybookRun.create.mockResolvedValue(newRun);

      const result = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'key-1',
      });

      // FAILED status should allow re-creation
      expect(result.id).toBe('run-new');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);
    });

    it('should create new run when existing run has STALE status', async () => {
      const existingRun = {
        id: 'run-stale',
        ...baseOptions,
        status: 'STALE',
        idempotencyKey: 'key-1',
      };
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(existingRun);

      const newRun = {
        id: 'run-new',
        ...baseOptions,
        status: 'QUEUED',
        idempotencyKey: 'key-1',
      };
      prismaMock.automationPlaybookRun.create.mockResolvedValue(newRun);

      const result = await service.createRun({
        ...baseOptions,
        idempotencyKey: 'key-1',
      });

      expect(result.id).toBe('run-new');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueueOrExecute', () => {
    it('should execute inline when queue is not available', async () => {
      const run = { id: 'run-1', status: 'QUEUED' };

      await service.enqueueOrExecute(run);

      expect(processorMock.processJob).toHaveBeenCalledWith('run-1');
    });

    it('should not execute when status is not QUEUED', async () => {
      const run = { id: 'run-1', status: 'RUNNING' };

      await service.enqueueOrExecute(run);

      expect(processorMock.processJob).not.toHaveBeenCalled();
    });

    it('should handle processor errors gracefully for inline execution', async () => {
      const run = { id: 'run-1', status: 'QUEUED' };
      processorMock.processJob.mockRejectedValue(new Error('Processing failed'));

      // Should not throw
      await expect(service.enqueueOrExecute(run)).resolves.not.toThrow();
    });
  });

  describe('getRunById', () => {
    beforeEach(() => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
      });
    });

    it('should return run when found', async () => {
      const run = {
        id: 'run-1',
        projectId: 'proj-1',
        status: 'SUCCEEDED',
      };
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(run);

      const result = await service.getRunById('user-1', 'proj-1', 'run-1');

      expect(result.id).toBe('run-1');
    });

    it('should throw NotFoundException when run not found', async () => {
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(null);

      await expect(
        service.getRunById('user-1', 'proj-1', 'run-missing'),
      ).rejects.toThrow('Run not found');
    });
  });

  describe('listRuns', () => {
    beforeEach(() => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
      });
    });

    it('should return runs with default limit', async () => {
      const runs = [
        { id: 'run-1', status: 'SUCCEEDED' },
        { id: 'run-2', status: 'QUEUED' },
      ];
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(runs);

      const result = await service.listRuns('user-1', 'proj-1', {});

      expect(result).toHaveLength(2);
      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply filters', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.listRuns('user-1', 'proj-1', {
        playbookId: 'missing_seo_title',
        runType: 'APPLY',
        limit: 50,
      });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            playbookId: 'missing_seo_title',
            runType: 'APPLY',
          }),
          take: 50,
        }),
      );
    });

    it('should cap limit at 100', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.listRuns('user-1', 'proj-1', { limit: 500 });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });
});

describe('AutomationPlaybookRunProcessor (status transitions)', () => {
  let processor: AutomationPlaybookRunProcessor;
  let prismaMock: {
    automationPlaybookRun: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let playbooksServiceMock: {
    previewPlaybook: jest.Mock;
    generateDraft: jest.Mock;
    applyPlaybook: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      automationPlaybookRun: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    playbooksServiceMock = {
      previewPlaybook: jest.fn(),
      generateDraft: jest.fn(),
      applyPlaybook: jest.fn(),
    };

    // Construct processor directly with mocks
    processor = new AutomationPlaybookRunProcessor(
      prismaMock as any,
      playbooksServiceMock as any,
    );
  });

  describe('processJob', () => {
    it('should skip if run not found', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue(null);

      await processor.processJob('run-missing');

      expect(prismaMock.automationPlaybookRun.update).not.toHaveBeenCalled();
    });

    it('should skip if run is not QUEUED', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'RUNNING',
      });

      await processor.processJob('run-1');

      expect(prismaMock.automationPlaybookRun.update).not.toHaveBeenCalled();
    });

    it('should transition to RUNNING then SUCCEEDED for PREVIEW_GENERATE', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'QUEUED',
        runType: 'PREVIEW_GENERATE',
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdByUserId: 'user-1',
        meta: {},
      });
      prismaMock.automationPlaybookRun.update.mockResolvedValue({});
      playbooksServiceMock.previewPlaybook.mockResolvedValue({
        draftId: 'draft-1',
      });

      await processor.processJob('run-1');

      // Check RUNNING transition
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({ status: 'RUNNING' }),
        }),
      );

      // Check SUCCEEDED transition with aiUsed=true
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            status: 'SUCCEEDED',
            aiUsed: true,
            draftId: 'draft-1',
          }),
        }),
      );
    });

    it('should transition to SUCCEEDED with aiUsed=false for APPLY', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'QUEUED',
        runType: 'APPLY',
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdByUserId: 'user-1',
        meta: {},
      });
      prismaMock.automationPlaybookRun.update.mockResolvedValue({});
      playbooksServiceMock.applyPlaybook.mockResolvedValue({
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
      });

      await processor.processJob('run-1');

      // Check SUCCEEDED transition with aiUsed=false
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            status: 'SUCCEEDED',
            aiUsed: false,
          }),
        }),
      );
    });

    it('should transition to STALE for PLAYBOOK_RULES_CHANGED error', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'QUEUED',
        runType: 'APPLY',
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdByUserId: 'user-1',
        meta: {},
      });
      prismaMock.automationPlaybookRun.update.mockResolvedValue({});

      const error = new Error('Rules changed');
      (error as any).code = 'PLAYBOOK_RULES_CHANGED';
      playbooksServiceMock.applyPlaybook.mockRejectedValue(error);

      await expect(processor.processJob('run-1')).rejects.toThrow();

      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            status: 'STALE',
            errorCode: 'PLAYBOOK_RULES_CHANGED',
          }),
        }),
      );
    });

    it('should transition to STALE for PLAYBOOK_SCOPE_INVALID error', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'QUEUED',
        runType: 'APPLY',
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdByUserId: 'user-1',
        meta: {},
      });
      prismaMock.automationPlaybookRun.update.mockResolvedValue({});

      const error = new Error('Scope invalid');
      (error as any).code = 'PLAYBOOK_SCOPE_INVALID';
      playbooksServiceMock.applyPlaybook.mockRejectedValue(error);

      await expect(processor.processJob('run-1')).rejects.toThrow();

      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            status: 'STALE',
            errorCode: 'PLAYBOOK_SCOPE_INVALID',
          }),
        }),
      );
    });

    it('should transition to FAILED for unknown errors', async () => {
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'QUEUED',
        runType: 'APPLY',
        projectId: 'proj-1',
        playbookId: 'missing_seo_title',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdByUserId: 'user-1',
        meta: {},
      });
      prismaMock.automationPlaybookRun.update.mockResolvedValue({});

      const error = new Error('Database connection lost');
      playbooksServiceMock.applyPlaybook.mockRejectedValue(error);

      await expect(processor.processJob('run-1')).rejects.toThrow();

      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorCode: 'INTERNAL_ERROR',
          }),
        }),
      );
    });
  });
});
