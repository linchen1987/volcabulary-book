import { describe, expect, it } from 'vitest';
import type { Word } from '~/lib/types';
import {
  countBaseWords,
  filterDerivedWords,
  isBaseWord,
  isDerivedWord,
  isSingleWord,
} from './word-family';

const makeWord = (id: string, overrides: Partial<Word> = {}): Word => ({
  id,
  spaceId: 'space1',
  content: `word-${id}`,
  level: 1,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe('isSingleWord', () => {
  it('should return true for single alphabetic word', () => {
    expect(isSingleWord('hello')).toBe(true);
    expect(isSingleWord('act')).toBe(true);
    expect(isSingleWord('ABC')).toBe(true);
  });

  it('should return false for phrases with spaces', () => {
    expect(isSingleWord('look up')).toBe(false);
    expect(isSingleWord('a b c')).toBe(false);
  });

  it('should return false for hyphenated words', () => {
    expect(isSingleWord('well-known')).toBe(false);
    expect(isSingleWord('self-aware')).toBe(false);
  });

  it('should return false for words with digits or symbols', () => {
    expect(isSingleWord('word123')).toBe(false);
    expect(isSingleWord('word!')).toBe(false);
    expect(isSingleWord('word.')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isSingleWord('')).toBe(false);
  });
});

describe('isBaseWord', () => {
  it('should return true for single word without baseWordId', () => {
    const word = makeWord('a', { content: 'act' });
    expect(isBaseWord(word)).toBe(true);
  });

  it('should return true for single word with self-referencing baseWordId (backward compat)', () => {
    const word = makeWord('a', { content: 'act', baseWordId: 'a' });
    expect(isBaseWord(word)).toBe(true);
  });

  it('should return false for single word derived from another word', () => {
    const word = makeWord('a', { content: 'acting', baseWordId: 'b' });
    expect(isBaseWord(word)).toBe(false);
  });

  it('should return false for phrase without baseWordId', () => {
    const word = makeWord('a', { content: 'look up' });
    expect(isBaseWord(word)).toBe(false);
  });

  it('should return false for hyphenated word without baseWordId', () => {
    const word = makeWord('a', { content: 'well-known' });
    expect(isBaseWord(word)).toBe(false);
  });

  it('should return false for phrase derived from another word', () => {
    const word = makeWord('a', { content: 'look up', baseWordId: 'b' });
    expect(isBaseWord(word)).toBe(false);
  });
});

describe('isDerivedWord', () => {
  it('should return false when baseWordId is undefined', () => {
    const word = makeWord('a', { content: 'act' });
    expect(isDerivedWord(word)).toBe(false);
  });

  it('should return false for self-referencing baseWordId', () => {
    const word = makeWord('a', { content: 'act', baseWordId: 'a' });
    expect(isDerivedWord(word)).toBe(false);
  });

  it('should return true when baseWordId points to another word', () => {
    const word = makeWord('a', { content: 'acting', baseWordId: 'b' });
    expect(isDerivedWord(word)).toBe(true);
  });
});

describe('countBaseWords', () => {
  it('should count only base words', () => {
    const words = [
      makeWord('a', { content: 'act' }),
      makeWord('b', { content: 'acting', baseWordId: 'a' }),
      makeWord('c', { content: 'action' }),
      makeWord('d', { content: 'look up' }),
    ];
    expect(countBaseWords(words)).toBe(2);
  });

  it('should return 0 for empty array', () => {
    expect(countBaseWords([])).toBe(0);
  });

  it('should handle self-referencing baseWordId as base word', () => {
    const words = [
      makeWord('a', { content: 'act', baseWordId: 'a' }),
      makeWord('b', { content: 'acting', baseWordId: 'a' }),
    ];
    expect(countBaseWords(words)).toBe(1);
  });
});

describe('filterDerivedWords', () => {
  it('should return words derived from the given baseWordId', () => {
    const words = [
      makeWord('a', { content: 'act' }),
      makeWord('b', { content: 'acting', baseWordId: 'a' }),
      makeWord('c', { content: 'action', baseWordId: 'a' }),
      makeWord('d', { content: 'look', baseWordId: 'e' }),
    ];
    const result = filterDerivedWords(words, 'a');
    expect(result).toHaveLength(2);
    expect(result.map((w) => w.id)).toEqual(['b', 'c']);
  });

  it('should return empty array when no derived words', () => {
    const words = [makeWord('a', { content: 'act' })];
    expect(filterDerivedWords(words, 'a')).toEqual([]);
  });
});
