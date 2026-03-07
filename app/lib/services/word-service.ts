import { db, generateId } from '~/lib/db';
import type { Space, Word } from '~/lib/types';

export interface WordStats {
  total: number;
  words: number;
  phrases: number;
  byLevel: Record<number, number>;
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
    .map((s) => s.trim().toLowerCase())
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
    },
  ): Promise<Word[]> {
    let words = await db.words.where('spaceId').equals(spaceId).toArray();

    if (options?.levelFilter !== undefined) {
      words = words.filter((w) => w.level === options.levelFilter);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      words = words.filter((w) => {
        if (w.content.toLowerCase().includes(searchLower)) return true;
        if (w.translation?.toLowerCase().includes(searchLower)) return true;
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
    },
  ): Promise<number> {
    let words = await db.words.where('spaceId').equals(spaceId).toArray();

    if (options?.levelFilter !== undefined) {
      words = words.filter((w) => w.level === options.levelFilter);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      words = words.filter((w) => {
        if (w.content.toLowerCase().includes(searchLower)) return true;
        if (w.translation?.toLowerCase().includes(searchLower)) return true;
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
        translation: data.translation,
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

  async deleteWord(id: string): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(id);
      if (word?.relatedWordIds) {
        for (const relatedId of word.relatedWordIds) {
          const relatedWord = await db.words.get(relatedId);
          if (relatedWord?.relatedWordIds) {
            const updatedIds = relatedWord.relatedWordIds.filter((rid) => rid !== id);
            await db.words.update(relatedId, {
              relatedWordIds: updatedIds.length > 0 ? updatedIds : undefined,
              updatedAt: Date.now(),
            });
          }
        }
      }
      await db.words.delete(id);
    });
  },

  async addRelatedWord(wordId: string, relatedWordId: string): Promise<void> {
    if (wordId === relatedWordId) return;

    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(wordId);
      const relatedWord = await db.words.get(relatedWordId);

      if (!word || !relatedWord) return;

      const wordRelatedIds = new Set(word.relatedWordIds || []);
      wordRelatedIds.add(relatedWordId);

      const relatedWordRelatedIds = new Set(relatedWord.relatedWordIds || []);
      relatedWordRelatedIds.add(wordId);

      await db.words.update(wordId, {
        relatedWordIds: Array.from(wordRelatedIds),
        updatedAt: Date.now(),
      });

      await db.words.update(relatedWordId, {
        relatedWordIds: Array.from(relatedWordRelatedIds),
      });
    });
  },

  async removeRelatedWord(wordId: string, relatedWordId: string): Promise<void> {
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      const word = await db.words.get(wordId);
      const relatedWord = await db.words.get(relatedWordId);

      if (word?.relatedWordIds) {
        const updatedIds = word.relatedWordIds.filter((id) => id !== relatedWordId);
        await db.words.update(wordId, {
          relatedWordIds: updatedIds.length > 0 ? updatedIds : undefined,
          updatedAt: Date.now(),
        });
      }

      if (relatedWord?.relatedWordIds) {
        const updatedIds = relatedWord.relatedWordIds.filter((id) => id !== wordId);
        await db.words.update(relatedWordId, {
          relatedWordIds: updatedIds.length > 0 ? updatedIds : undefined,
        });
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
};
