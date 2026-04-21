import { db, generateId } from '~/lib/db';
import type { Space, Word } from '~/lib/types';
import { addRelation, cleanupRelationsOnDelete, removeRelation } from './related-words';
import { countBaseWords, isBaseWord } from './word-family';

export interface WordStats {
  total: number;
  words: number;
  phrases: number;
  byLevel: Record<number, number>;
  baseWordCount: number;
}

export type SortField = 'createdAt' | 'updatedAt' | 'level' | 'content';
export type SortOrder = 'asc' | 'desc';

export const SpaceService = {
  async getAllSpaces(): Promise<Space[]> {
    return db.spaces.toArray();
  },

  async getSpace(id: string): Promise<Space | undefined> {
    return db.spaces.get(id);
  },

  async createSpace(name: string): Promise<string> {
    const id = generateId();
    await db.transaction('rw', [db.spaces, db.syncEvents], async () => {
      await db.spaces.add({
        id,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    return id;
  },

  async updateSpace(id: string, updates: Partial<Omit<Space, 'id' | 'createdAt'>>): Promise<void> {
    await db.transaction('rw', [db.spaces, db.syncEvents], async () => {
      await db.spaces.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    });
  },

  async deleteSpace(id: string): Promise<void> {
    await db.transaction('rw', [db.spaces, db.words, db.syncEvents], async () => {
      await db.words.where('spaceId').equals(id).delete();
      await db.spaces.delete(id);
      await db.syncEvents.where('spaceId').equals(id).delete();
    });
  },
};

function splitContent(content: string): string[] {
  return content
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const WordService = {
  async getWordsBySpace(
    spaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: SortField;
      sortOrder?: SortOrder;
      levelFilter?: number;
      search?: string;
      typeFilter?: 'all' | 'word' | 'phrase' | 'base-word';
    },
  ): Promise<Word[]> {
    let words = await db.words.where('spaceId').equals(spaceId).toArray();

    if (options?.levelFilter !== undefined) {
      words = words.filter((w) => w.level === options.levelFilter);
    }

    if (options?.typeFilter === 'word') {
      words = words.filter((w) => !w.content.includes(' '));
    } else if (options?.typeFilter === 'phrase') {
      words = words.filter((w) => w.content.includes(' '));
    } else if (options?.typeFilter === 'base-word') {
      words = words.filter((w) => isBaseWord(w));
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      words = words.filter((w) => {
        if (w.content.toLowerCase().includes(searchLower)) return true;
        if (
          w.usages?.some(
            (u) =>
              u.sentence.toLowerCase().includes(searchLower) ||
              u.translation?.toLowerCase().includes(searchLower),
          )
        )
          return true;
        if (w.description?.toLowerCase().includes(searchLower)) return true;
        return false;
      });
    }

    const sortBy = options?.sortBy || 'updatedAt';
    const sortOrder = options?.sortOrder || 'desc';

    words.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'level':
          comparison = a.level - b.level;
          break;
        case 'content':
          comparison = a.content.localeCompare(b.content);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const offset = options?.offset || 0;
    if (options?.limit) {
      words = words.slice(offset, offset + options.limit);
    }

    return words;
  },

  async getWordCountBySpace(
    spaceId: string,
    options?: {
      levelFilter?: number;
      search?: string;
      typeFilter?: 'all' | 'word' | 'phrase' | 'base-word';
    },
  ): Promise<number> {
    let words = await db.words.where('spaceId').equals(spaceId).toArray();

    if (options?.levelFilter !== undefined) {
      words = words.filter((w) => w.level === options.levelFilter);
    }

    if (options?.typeFilter === 'word') {
      words = words.filter((w) => !w.content.includes(' '));
    } else if (options?.typeFilter === 'phrase') {
      words = words.filter((w) => w.content.includes(' '));
    } else if (options?.typeFilter === 'base-word') {
      words = words.filter((w) => isBaseWord(w));
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      words = words.filter((w) => {
        if (w.content.toLowerCase().includes(searchLower)) return true;
        if (
          w.usages?.some(
            (u) =>
              u.sentence.toLowerCase().includes(searchLower) ||
              u.translation?.toLowerCase().includes(searchLower),
          )
        )
          return true;
        if (w.description?.toLowerCase().includes(searchLower)) return true;
        return false;
      });
    }

    return words.length;
  },

  async getStats(spaceId: string): Promise<WordStats> {
    const words = await db.words.where('spaceId').equals(spaceId).toArray();
    const byLevel: Record<number, number> = {};

    for (const word of words) {
      byLevel[word.level] = (byLevel[word.level] || 0) + 1;
    }

    const wordCount = words.filter((w) => !w.content.includes(' ')).length;
    const phraseCount = words.filter((w) => w.content.includes(' ')).length;

    return {
      total: words.length,
      words: wordCount,
      phrases: phraseCount,
      byLevel,
      baseWordCount: countBaseWords(words),
    };
  },

  async getWord(id: string): Promise<Word | undefined> {
    return db.words.get(id);
  },

  async createWord(
    spaceId: string,
    data: Partial<Omit<Word, 'id' | 'spaceId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<string> {
    const content = data.content?.trim() || '';
    if (!content) {
      throw new Error('单词内容不能为空');
    }

    const existingWords = await db.words.where('spaceId').equals(spaceId).toArray();
    const newTokens = splitContent(content);
    const duplicate = existingWords.find((word) => {
      const existingTokens = splitContent(word.content);
      return newTokens.some((nt) => existingTokens.includes(nt));
    });
    if (duplicate) {
      throw new Error('该单词已存在');
    }

    const id = generateId();
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      await db.words.add({
        id,
        spaceId,
        content,
        description: data.description,
        usages: data.usages,
        level: data.level ?? 1,
        phonetic: data.phonetic,
        audioUrl: data.audioUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    return id;
  },

  async updateWord(
    id: string,
    updates: Partial<Omit<Word, 'id' | 'spaceId' | 'createdAt'>>,
  ): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      await db.words.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    });
  },

  async updateWordLevel(id: string, level: number): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      await db.words.update(id, {
        level,
        updatedAt: Date.now(),
      });
    });
  },

  async deleteWord(id: string): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(id);
      if (!word) return;

      if (word.baseWordId === id) {
        const derived = await db.words
          .where('spaceId')
          .equals(word.spaceId)
          .filter((w) => w.baseWordId === id && w.id !== id)
          .toArray();
        for (const d of derived) {
          await db.words.update(d.id, { baseWordId: undefined, updatedAt: Date.now() });
        }
      }

      if (word.relatedWordIds?.length) {
        const relatedWords = await db.words.where('id').anyOf(word.relatedWordIds).toArray();
        const cleanups = cleanupRelationsOnDelete(word, relatedWords);
        await Promise.all(cleanups.map((c) => db.words.update(c.id, c.update)));
      }
      await db.words.delete(id);
    });
  },

  async addRelatedWord(wordId: string, relatedWordId: string): Promise<void> {
    if (wordId === relatedWordId) return;

    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const [word, relatedWord] = await Promise.all([
        db.words.get(wordId),
        db.words.get(relatedWordId),
      ]);

      if (!word || !relatedWord) return;

      const result = addRelation(word, relatedWord);
      if (!result) return;

      await Promise.all([
        db.words.update(wordId, result.wordUpdate),
        db.words.update(relatedWordId, result.relatedUpdate),
      ]);
    });
  },

  async removeRelatedWord(wordId: string, relatedWordId: string): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const [word, relatedWord] = await Promise.all([
        db.words.get(wordId),
        db.words.get(relatedWordId),
      ]);

      if (!word || !relatedWord) return;

      const result = removeRelation(word, relatedWord);
      if (!result) return;

      await Promise.all([
        db.words.update(wordId, result.wordUpdate),
        db.words.update(relatedWordId, result.relatedUpdate),
      ]);
    });
  },

  async batchUpdateRelations(
    wordId: string,
    currentRelatedIds: string[],
    originalRelatedIds: string[],
  ): Promise<void> {
    const toAdd = currentRelatedIds.filter((id) => !originalRelatedIds.includes(id));
    const toRemove = originalRelatedIds.filter((id) => !currentRelatedIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(wordId);
      if (!word) return;

      const allIds = [...toAdd, ...toRemove];
      const relatedWords = await db.words.where('id').anyOf(allIds).toArray();
      const relatedMap = new Map(relatedWords.map((w) => [w.id, w]));

      for (const relId of toRemove) {
        const relWord = relatedMap.get(relId);
        if (!relWord) continue;
        const result = removeRelation(word, relWord);
        if (!result) continue;
        await db.words.update(wordId, result.wordUpdate);
        await db.words.update(relId, result.relatedUpdate);
        relatedMap.set(relId, { ...relWord, ...result.relatedUpdate } as Word);
      }

      const updatedWord = await db.words.get(wordId);
      if (!updatedWord) return;

      for (const relId of toAdd) {
        const relWord = relatedMap.get(relId);
        if (!relWord) continue;
        const result = addRelation(updatedWord, relWord);
        if (!result) continue;
        await db.words.update(wordId, result.wordUpdate);
        await db.words.update(relId, result.relatedUpdate);
        relatedMap.set(relId, { ...relWord, ...result.relatedUpdate } as Word);
        Object.assign(updatedWord, result.wordUpdate);
      }
    });
  },

  async getRelatedWords(wordId: string): Promise<Word[]> {
    const word = await db.words.get(wordId);
    if (!word?.relatedWordIds || word.relatedWordIds.length === 0) {
      return [];
    }
    return db.words.where('id').anyOf(word.relatedWordIds).toArray();
  },

  async getWordsByLevel(spaceId: string, level: number): Promise<Word[]> {
    return db.words.where({ spaceId, level }).reverse().sortBy('updatedAt');
  },

  async checkWordExists(spaceId: string, content: string): Promise<Word | undefined> {
    const trimmedContent = content.trim();
    if (!trimmedContent) return undefined;

    const newTokens = splitContent(trimmedContent);
    if (newTokens.length === 0) return undefined;

    const existingWords = await db.words.where('spaceId').equals(spaceId).toArray();
    return existingWords.find((word) => {
      const existingTokens = splitContent(word.content);
      return newTokens.some((nt) => existingTokens.includes(nt));
    });
  },

  async setBaseWordId(
    wordId: string,
    baseWordId: string | undefined,
    spaceId: string,
  ): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(wordId);
      if (!word) throw new Error('单词不存在');

      if (!baseWordId || baseWordId === wordId) {
        await db.words.update(wordId, { baseWordId: undefined, updatedAt: Date.now() });
        return;
      }

      const targetWord = await db.words.get(baseWordId);
      if (!targetWord) throw new Error('目标词不存在');
      if (targetWord.spaceId !== spaceId) throw new Error('目标词不在同一空间');

      await db.words.update(wordId, { baseWordId, updatedAt: Date.now() });
    });
  },

  async getDerivedWords(baseWordId: string, spaceId: string): Promise<Word[]> {
    const words = await db.words.where('spaceId').equals(spaceId).toArray();
    return words.filter((w) => w.baseWordId === baseWordId && w.id !== baseWordId);
  },
};
