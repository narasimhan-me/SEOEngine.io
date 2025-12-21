/**
 * Unit tests for AnswerBlockService
 *
 * Tests:
 * - getAnswerBlocks() returns all answer blocks for a product
 * - createOrUpdateAnswerBlocks() creates new blocks
 * - createOrUpdateAnswerBlocks() updates existing blocks
 * - createOrUpdateAnswerBlocks() filters invalid blocks
 * - createOrUpdateAnswerBlocks() clears blocks when no valid blocks
 * - deleteAnswerBlocks() deletes all blocks for a product
 */
import { AnswerBlockService } from '../../../src/products/answer-block.service';
import { PrismaService } from '../../../src/prisma.service';
import { ANSWER_QUESTION_IDS } from '@engineo/shared';

const createPrismaMock = () => ({
  answerBlock: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
});

describe('AnswerBlockService', () => {
  let service: AnswerBlockService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new AnswerBlockService(prismaMock as unknown as PrismaService);
  });

  describe('getAnswerBlocks', () => {
    it('should return all answer blocks for a product', async () => {
      const mockBlocks = [
        {
          id: 'block-1',
          productId: 'prod-1',
          questionId: 'what_is_it',
          questionText: 'What is this?',
          answerText: 'This is a product',
          confidenceScore: 0.9,
        },
        {
          id: 'block-2',
          productId: 'prod-1',
          questionId: 'who_is_it_for',
          questionText: 'Who is it for?',
          answerText: 'For everyone',
          confidenceScore: 0.8,
        },
      ];

      prismaMock.answerBlock.findMany.mockResolvedValue(mockBlocks);

      const result = await service.getAnswerBlocks('prod-1');

      expect(result).toEqual(mockBlocks);
      expect(prismaMock.answerBlock.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { questionId: 'asc' },
      });
    });
  });

  describe('createOrUpdateAnswerBlocks', () => {
    it('should create new answer blocks', async () => {
      const mockBlocks = [
        {
          questionId: 'what_is_it',
          question: 'What is this?',
          answer: 'This is a product',
          confidence: 0.9,
          sourceType: 'generated',
          factsUsed: ['title'],
        },
      ];

      const mockUpserted = {
        id: 'block-1',
        productId: 'prod-1',
        questionId: 'what_is_it',
        questionText: 'What is this?',
        answerText: 'This is a product',
        confidenceScore: 0.9,
      };

      prismaMock.answerBlock.upsert.mockResolvedValue(mockUpserted);

      const result = await service.createOrUpdateAnswerBlocks('prod-1', mockBlocks);

      expect(result).toHaveLength(1);
      expect(prismaMock.answerBlock.upsert).toHaveBeenCalledWith({
        where: {
          productId_questionId: {
            productId: 'prod-1',
            questionId: 'what_is_it',
          },
        },
        create: expect.objectContaining({
          productId: 'prod-1',
          questionId: 'what_is_it',
          questionText: 'What is this?',
          answerText: 'This is a product',
          confidenceScore: 0.9,
        }),
        update: expect.any(Object),
      });
    });

    it('should filter out invalid blocks', async () => {
      const mockBlocks = [
        {
          questionId: 'what_is_it',
          question: 'What is this?',
          answer: 'This is a product',
          confidence: 0.9,
        },
        {
          questionId: 'invalid_question',
          question: 'Invalid',
          answer: 'Answer',
          confidence: 0.9,
        },
        null as any,
        {
          questionId: 'who_is_it_for',
          question: '',
          answer: 'Answer',
          confidence: 0.9,
        },
      ];

      const mockUpserted = {
        id: 'block-1',
        productId: 'prod-1',
        questionId: 'what_is_it',
        questionText: 'What is this?',
        answerText: 'This is a product',
        confidenceScore: 0.9,
      };

      prismaMock.answerBlock.upsert.mockResolvedValue(mockUpserted);

      const result = await service.createOrUpdateAnswerBlocks('prod-1', mockBlocks);

      // Only valid block should be processed
      expect(result).toHaveLength(1);
      expect(prismaMock.answerBlock.upsert).toHaveBeenCalledTimes(1);
    });

    it('should clear blocks when no valid blocks provided', async () => {
      const mockBlocks = [
        {
          questionId: 'invalid_question',
          question: 'Invalid',
          answer: 'Answer',
          confidence: 0.9,
        },
      ];

      prismaMock.answerBlock.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.createOrUpdateAnswerBlocks('prod-1', mockBlocks);

      expect(result).toEqual([]);
      expect(prismaMock.answerBlock.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
      expect(prismaMock.answerBlock.upsert).not.toHaveBeenCalled();
    });

    it('should clamp confidence score to 0-1 range', async () => {
      const mockBlocks = [
        {
          questionId: 'what_is_it',
          question: 'What is this?',
          answer: 'This is a product',
          confidence: 1.5, // Above 1
        },
        {
          questionId: 'who_is_it_for',
          question: 'Who is it for?',
          answer: 'For everyone',
          confidence: -0.5, // Below 0
        },
      ];

      prismaMock.answerBlock.upsert
        .mockResolvedValueOnce({
          id: 'block-1',
          productId: 'prod-1',
          questionId: 'what_is_it',
          confidenceScore: 1,
        })
        .mockResolvedValueOnce({
          id: 'block-2',
          productId: 'prod-1',
          questionId: 'who_is_it_for',
          confidenceScore: 0,
        });

      await service.createOrUpdateAnswerBlocks('prod-1', mockBlocks);

      expect(prismaMock.answerBlock.upsert).toHaveBeenCalledTimes(2);
      
      // Check first call (confidence 1.5 clamped to 1)
      expect(prismaMock.answerBlock.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({
            confidenceScore: 1, // Clamped to 1
          }),
        }),
      );

      // Check second call (confidence -0.5 clamped to 0)
      expect(prismaMock.answerBlock.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          create: expect.objectContaining({
            confidenceScore: 0, // Clamped to 0
          }),
        }),
      );
    });
  });

  describe('deleteAnswerBlocks', () => {
    it('should delete all answer blocks for a product', async () => {
      prismaMock.answerBlock.deleteMany.mockResolvedValue({ count: 3 });

      await service.deleteAnswerBlocks('prod-1');

      expect(prismaMock.answerBlock.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
    });
  });
});

