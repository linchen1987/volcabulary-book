import Dexie from 'dexie';
import { db, generateId } from '~/lib/db';
import type { Space, Word } from '~/lib/types';

export interface WordStats {
  total: number;
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
      await db.syncEvents.where('spaceId').equals(id).delete();
      await db.spaces.delete(id);
    });
  },
};

export const WordService = {
  async getWordsBySpace(
    spaceId: string,
    options?: {
      limit?: number;
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
        if (
          w.translationGroups?.some(
            (g) =>
              g.translation.toLowerCase().includes(searchLower) ||
              g.usages?.some(
                (u) =>
                  u.sentence.toLowerCase().includes(searchLower) ||
                  u.translation?.toLowerCase().includes(searchLower),
              ),
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

    if (options?.limit) {
      words = words.slice(0, options.limit);
    }

    return words;
  },

  async getWordCountBySpace(spaceId: string): Promise<number> {
    return db.words.where('spaceId').equals(spaceId).count();
  },

  async getStats(spaceId: string): Promise<WordStats> {
    const words = await db.words.where('spaceId').equals(spaceId).toArray();
    const byLevel: Record<number, number> = {};

    for (const word of words) {
      byLevel[word.level] = (byLevel[word.level] || 0) + 1;
    }

    return {
      total: words.length,
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
    const id = generateId();
    await db.transaction('rw', [db.words, db.syncEvents], async () => {
      await db.words.add({
        id,
        spaceId,
        content: data.content || '',
        description: data.description,
        translationGroups: data.translationGroups,
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
      await db.words.delete(id);
    });
  },

  async getWordsByLevel(spaceId: string, level: number): Promise<Word[]> {
    return db.words.where({ spaceId, level }).reverse().sortBy('updatedAt');
  },
};

export const NoteService = SpaceService;
