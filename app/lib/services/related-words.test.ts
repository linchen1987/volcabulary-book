import { describe, expect, it } from 'vitest';
import type { Word } from '~/lib/types';
import {
  addRelation,
  cleanupRelationsOnDelete,
  computeRelationDiff,
  removeRelation,
  validateConsistency,
} from './related-words';

const makeWord = (id: string, overrides: Partial<Word> = {}): Word => ({
  id,
  spaceId: 'space1',
  content: `word-${id}`,
  level: 1,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe('addRelation', () => {
  it('should add bidirectional relation between two words', () => {
    const wordA = makeWord('a');
    const wordB = makeWord('b');

    const result = addRelation(wordA, wordB);

    expect(result).not.toBeNull();
    expect(result?.wordUpdate.relatedWordIds).toEqual(['b']);
    expect(result?.relatedUpdate.relatedWordIds).toEqual(['a']);
    expect(result?.wordUpdate.updatedAt).toBeDefined();
    expect(result?.relatedUpdate.updatedAt).toBeDefined();
    expect(result!.wordUpdate.updatedAt!).toBeGreaterThan(result!.relatedUpdate.updatedAt!);
  });

  it('should return null when adding self-relation', () => {
    const word = makeWord('a');
    expect(addRelation(word, word)).toBeNull();
  });

  it('should return null when already related', () => {
    const wordA = makeWord('a', { relatedWordIds: ['b'] });
    const wordB = makeWord('b', { relatedWordIds: ['a'] });

    expect(addRelation(wordA, wordB)).toBeNull();
  });

  it('should preserve existing relations when adding new one', () => {
    const wordA = makeWord('a', { relatedWordIds: ['c'] });
    const wordB = makeWord('b', { relatedWordIds: ['d'] });

    const result = addRelation(wordA, wordB);

    expect(result?.wordUpdate.relatedWordIds).toContain('c');
    expect(result?.wordUpdate.relatedWordIds).toContain('b');
    expect(result?.relatedUpdate.relatedWordIds).toContain('d');
    expect(result?.relatedUpdate.relatedWordIds).toContain('a');
  });

  it('should handle words with undefined relatedWordIds', () => {
    const wordA = makeWord('a');
    const wordB = makeWord('b');

    const result = addRelation(wordA, wordB);

    expect(result?.wordUpdate.relatedWordIds).toEqual(['b']);
    expect(result?.relatedUpdate.relatedWordIds).toEqual(['a']);
  });
});

describe('removeRelation', () => {
  it('should remove bidirectional relation', () => {
    const wordA = makeWord('a', { relatedWordIds: ['b'] });
    const wordB = makeWord('b', { relatedWordIds: ['a'] });

    const result = removeRelation(wordA, wordB);

    expect(result).not.toBeNull();
    expect(result?.wordUpdate.relatedWordIds).toBeUndefined();
    expect(result?.relatedUpdate.relatedWordIds).toBeUndefined();
    expect(result!.wordUpdate.updatedAt!).toBeGreaterThan(result!.relatedUpdate.updatedAt!);
  });

  it('should preserve other relations when removing one', () => {
    const wordA = makeWord('a', { relatedWordIds: ['b', 'c'] });
    const wordB = makeWord('b', { relatedWordIds: ['a', 'd'] });

    const result = removeRelation(wordA, wordB);

    expect(result?.wordUpdate.relatedWordIds).toEqual(['c']);
    expect(result?.relatedUpdate.relatedWordIds).toEqual(['d']);
  });

  it('should return null when relation does not exist', () => {
    const wordA = makeWord('a', { relatedWordIds: ['c'] });
    const wordB = makeWord('b', { relatedWordIds: ['d'] });

    expect(removeRelation(wordA, wordB)).toBeNull();
  });

  it('should return null when both words have no relations', () => {
    const wordA = makeWord('a');
    const wordB = makeWord('b');

    expect(removeRelation(wordA, wordB)).toBeNull();
  });

  it('should handle one-way relation cleanup (inconsistent state)', () => {
    const wordA = makeWord('a', { relatedWordIds: ['b'] });
    const wordB = makeWord('b');

    const result = removeRelation(wordA, wordB);

    expect(result).not.toBeNull();
    expect(result?.wordUpdate.relatedWordIds).toBeUndefined();
    expect(result?.relatedUpdate.relatedWordIds).toBeUndefined();
  });
});

describe('cleanupRelationsOnDelete', () => {
  it('should clean reverse references when word is deleted', () => {
    const wordToDelete = makeWord('a', { relatedWordIds: ['b', 'c'] });
    const wordB = makeWord('b', { relatedWordIds: ['a', 'd'] });
    const wordC = makeWord('c', { relatedWordIds: ['a'] });

    const cleanups = cleanupRelationsOnDelete(wordToDelete, [wordB, wordC]);

    expect(cleanups).toHaveLength(2);

    const bCleanup = cleanups.find((c) => c.id === 'b');
    expect(bCleanup).toBeDefined();
    expect(bCleanup?.update.relatedWordIds).toEqual(['d']);

    const cCleanup = cleanups.find((c) => c.id === 'c');
    expect(cCleanup).toBeDefined();
    expect(cCleanup?.update.relatedWordIds).toBeUndefined();
  });

  it('should return empty array when word has no relations', () => {
    const word = makeWord('a');
    expect(cleanupRelationsOnDelete(word, [])).toEqual([]);
  });

  it('should return empty array when relatedWordIds is undefined', () => {
    const word = makeWord('a', { relatedWordIds: undefined });
    expect(cleanupRelationsOnDelete(word, [])).toEqual([]);
  });

  it('should return empty array when relatedWordIds is empty', () => {
    const word = makeWord('a', { relatedWordIds: [] });
    expect(cleanupRelationsOnDelete(word, [])).toEqual([]);
  });
});

describe('computeRelationDiff', () => {
  it('should compute additions and removals', () => {
    const result = computeRelationDiff(['a', 'b', 'c'], ['b', 'd']);
    expect(result.toAdd).toEqual(['a', 'c']);
    expect(result.toRemove).toEqual(['d']);
  });

  it('should return empty arrays when no changes', () => {
    const result = computeRelationDiff(['a', 'b'], ['a', 'b']);
    expect(result.toAdd).toEqual([]);
    expect(result.toRemove).toEqual([]);
  });

  it('should handle empty arrays', () => {
    const result = computeRelationDiff(['a'], []);
    expect(result.toAdd).toEqual(['a']);
    expect(result.toRemove).toEqual([]);

    const result2 = computeRelationDiff([], ['a']);
    expect(result2.toAdd).toEqual([]);
    expect(result2.toRemove).toEqual(['a']);
  });

  it('should handle all new additions', () => {
    const result = computeRelationDiff(['a', 'b'], []);
    expect(result.toAdd).toEqual(['a', 'b']);
    expect(result.toRemove).toEqual([]);
  });

  it('should handle all removals', () => {
    const result = computeRelationDiff([], ['a', 'b']);
    expect(result.toAdd).toEqual([]);
    expect(result.toRemove).toEqual(['a', 'b']);
  });
});

describe('validateConsistency', () => {
  it('should return empty for consistent relations', () => {
    const words = [
      makeWord('a', { relatedWordIds: ['b'] }),
      makeWord('b', { relatedWordIds: ['a'] }),
    ];

    expect(validateConsistency(words)).toEqual([]);
  });

  it('should detect one-way relations', () => {
    const words = [makeWord('a', { relatedWordIds: ['b'] }), makeWord('b')];

    const issues = validateConsistency(words);
    expect(issues).toHaveLength(1);
    expect(issues[0].wordId).toBe('a');
    expect(issues[0].missingFrom).toEqual(['b']);
  });

  it('should detect multiple inconsistencies', () => {
    const words = [
      makeWord('a', { relatedWordIds: ['b', 'c'] }),
      makeWord('b', { relatedWordIds: ['c'] }),
      makeWord('c', { relatedWordIds: ['a', 'b'] }),
    ];

    const issues = validateConsistency(words);
    expect(issues).toHaveLength(1);
    expect(issues[0].wordId).toBe('a');
    expect(issues[0].missingFrom).toEqual(['b']);
  });

  it('should skip words with no relations', () => {
    const words = [makeWord('a'), makeWord('b'), makeWord('c')];
    expect(validateConsistency(words)).toEqual([]);
  });

  it('should handle dangling references (related ID not found)', () => {
    const words = [makeWord('a', { relatedWordIds: ['nonexistent'] })];
    expect(validateConsistency(words)).toEqual([]);
  });
});
