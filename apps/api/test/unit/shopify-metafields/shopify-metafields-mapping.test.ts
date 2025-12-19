// Unit tests for Answer Block → Shopify metafield mapping helpers (AEO-2).
// Verifies mapping behavior, handling of unknown questionIds, and payload trimming.

import { mapAnswerBlocksToMetafieldPayloads } from '../../../src/shopify/shopify.service';
import { ANSWER_QUESTION_IDS } from '@engineo/shared';

describe('mapAnswerBlocksToMetafieldPayloads', () => {
  it('maps known AnswerBlock questionIds to metafield keys and trims values', () => {
    const blocks = ANSWER_QUESTION_IDS.map((questionId) => ({
      questionId,
      answerText: ` Answer for ${questionId} `,
    }));

    const { mappings, skippedUnknownQuestionIds } =
      mapAnswerBlocksToMetafieldPayloads(blocks);

    expect(skippedUnknownQuestionIds).toEqual([]);
    expect(mappings.length).toBe(blocks.length);

    const keysByQuestionId: Record<string, string> = {};
    for (const mapping of mappings) {
      const block = blocks.find(
        (b) => mapping.value === `Answer for ${b.questionId}`,
      );
      expect(block).toBeDefined();
      if (block) {
        keysByQuestionId[block.questionId] = mapping.key;
      }
      expect(mapping.value.startsWith('Answer for ')).toBe(true);
      expect(mapping.value.endsWith(' ')).toBe(false);
    }

    expect(keysByQuestionId['what_is_it']).toBe('answer_what_is_it');
    expect(keysByQuestionId['key_features']).toBe('answer_key_features');
    expect(keysByQuestionId['materials_and_specs']).toBe('answer_materials');
    expect(keysByQuestionId['care_safety_instructions']).toBe(
      'answer_care_instructions',
    );
  });

  it('skips unknown questionIds while recording them', () => {
    const blocks = [
      { questionId: 'what_is_it', answerText: 'Known answer' },
      { questionId: 'unknown_question', answerText: 'Should be skipped' },
    ];

    const { mappings, skippedUnknownQuestionIds } =
      mapAnswerBlocksToMetafieldPayloads(blocks);

    expect(mappings.length).toBe(1);
    expect(mappings[0].value).toBe('Known answer');
    expect(skippedUnknownQuestionIds).toEqual(['unknown_question']);
  });

  it('skips empty or whitespace-only answers', () => {
    const blocks = [
      { questionId: 'what_is_it', answerText: '   ' },
      { questionId: 'key_features', answerText: 'Has value' },
    ];

    const { mappings } = mapAnswerBlocksToMetafieldPayloads(blocks);

    expect(mappings.length).toBe(1);
    expect(mappings[0].value).toBe('Has value');
  });
});
