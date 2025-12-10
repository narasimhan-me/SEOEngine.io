// Jest unit tests for AE-1.3 – Answer Block Persistence.
// These tests exercise AnswerBlockService using the test Prisma client and verify
// that per-product Answer Blocks are created, updated, cleared, and validated
// according to the AE-1.3 specification.
//
// Specs referenced:
// - docs/ANSWER_ENGINE_SPEC.md (Phase AE-1.3 – Answer Block Persistence)
// - IMPLEMENTATION_PLAN.md (Phase AE-1.3 – Answer Block Persistence (Shopify v1))
// - docs/manual-testing/phase-ae-1.3-answer-block-persistence.md
//
// Service under test:
// - apps/api/src/products/answer-block.service.ts (AnswerBlockService)

import { AnswerBlockService } from '../../../apps/api/src/products/answer-block.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../../apps/api/test/utils/test-db';

describe('AnswerBlockService (AE-1.3 Answer Block Persistence)', () => {
  let service: AnswerBlockService;

  beforeAll(() => {
    // Wire AnswerBlockService to the shared test Prisma client.
    service = new AnswerBlockService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  async function createUserProjectAndProduct() {
    const user = await testPrisma.user.create({
      data: {
        email: `ae13-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'AE-1.3 Test User',
      },
    });

    const project = await testPrisma.project.create({
      data: {
        name: 'AE-1.3 Test Project',
        domain: 'ae13-test.example.com',
        userId: user.id,
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'shopify-ae13-product',
        title: 'AE-1.3 Test Product',
        description: 'Answer Block persistence test product.',
      },
    });

    return { user, project, product };
  }

  it('creates Answer Blocks for valid question IDs', async () => {
    const { product } = await createUserProjectAndProduct();

    const blocks = [
      {
        questionId: 'what_is_it',
        question: 'What is this product?',
        answer: 'It is a test product used for AE-1.3.',
        confidence: 0.9,
        sourceType: 'test',
        factsUsed: ['title', 'description'],
      },
      {
        questionId: 'who_is_it_for',
        question: 'Who is it for?',
        answer: 'For automated AE-1.3 persistence tests.',
        confidence: 0.8,
        sourceType: 'test',
        factsUsed: ['description'],
      },
    ];

    const result = await service.createOrUpdateAnswerBlocks(product.id, blocks);
    expect(result).toHaveLength(2);

    const rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
      orderBy: { questionId: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.questionId).sort()).toEqual(
      ['what_is_it', 'who_is_it_for'].sort(),
    );
  });

  it('upserts Answer Blocks by (productId, questionId)', async () => {
    const { product } = await createUserProjectAndProduct();

    await service.createOrUpdateAnswerBlocks(product.id, [
      {
        questionId: 'what_is_it',
        question: 'Original question?',
        answer: 'Original answer.',
        confidence: 0.5,
        sourceType: 'test',
        factsUsed: [],
      },
    ]);

    await service.createOrUpdateAnswerBlocks(product.id, [
      {
        questionId: 'what_is_it',
        question: 'Updated question?',
        answer: 'Updated answer.',
        confidence: 0.95,
        sourceType: 'test-updated',
        factsUsed: ['description'],
      },
    ]);

    const rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].questionId).toBe('what_is_it');
    expect(rows[0].questionText).toBe('Updated question?');
    expect(rows[0].answerText).toBe('Updated answer.');
    expect(rows[0].confidenceScore).toBeGreaterThanOrEqual(0.9);
    expect(rows[0].sourceType).toBe('test-updated');
  });

  it('filters out invalid questionIds and malformed blocks', async () => {
    const { product } = await createUserProjectAndProduct();

    await service.createOrUpdateAnswerBlocks(product.id, [
      {
        // invalid questionId, should be ignored
        questionId: 'invalid_question_id',
        question: 'Invalid question',
        answer: 'Invalid answer',
        confidence: 0.7,
      } as any,
      {
        // missing answer, should be ignored
        questionId: 'what_is_it',
        question: 'Missing answer',
        answer: '',
        confidence: 0.7,
      } as any,
      {
        questionId: 'what_is_it',
        question: 'Valid question',
        answer: 'Valid answer for AE-1.3.',
        confidence: 0.6,
        sourceType: 'test',
        factsUsed: [],
      },
    ]);

    const rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].questionId).toBe('what_is_it');
    expect(rows[0].answerText).toBe('Valid answer for AE-1.3.');
  });

  it('clears existing Answer Blocks when no valid blocks are provided', async () => {
    const { product } = await createUserProjectAndProduct();

    await service.createOrUpdateAnswerBlocks(product.id, [
      {
        questionId: 'what_is_it',
        question: 'To be cleared',
        answer: 'This answer will be removed.',
        confidence: 0.7,
        sourceType: 'test',
        factsUsed: [],
      },
    ]);

    let rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows.length).toBe(1);

    await service.createOrUpdateAnswerBlocks(product.id, []);

    rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows.length).toBe(0);
  });

  it('deleteAnswerBlocks removes all Answer Blocks for a product', async () => {
    const { product } = await createUserProjectAndProduct();

    await service.createOrUpdateAnswerBlocks(product.id, [
      {
        questionId: 'what_is_it',
        question: 'Question 1',
        answer: 'Answer 1',
        confidence: 0.9,
        sourceType: 'test',
        factsUsed: [],
      },
      {
        questionId: 'who_is_it_for',
        question: 'Question 2',
        answer: 'Answer 2',
        confidence: 0.9,
        sourceType: 'test',
        factsUsed: [],
      },
    ]);

    let rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows.length).toBe(2);

    await service.deleteAnswerBlocks(product.id);

    rows = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(rows.length).toBe(0);
  });
});
