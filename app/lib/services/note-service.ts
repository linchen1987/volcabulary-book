import Dexie from 'dexie';
import { db, generateId } from '~/lib/db';
import type { Space, Word } from '~/lib/types';

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
  async getWordsBySpace(spaceId: string, limit?: number): Promise<Word[]> {
    const query = db.words
      .where('[spaceId+updatedAt]')
      .between([spaceId, Dexie.minKey], [spaceId, Dexie.maxKey])
      .reverse();

    if (limit) {
      return query.limit(limit).toArray();
    }
    return query.toArray();
  },

  async getWordCountBySpace(spaceId: string): Promise<number> {
    return db.words.where('spaceId').equals(spaceId).count();
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
        translations: data.translations,
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
      await db.words.delete(id);
    });
  },

  async getWordsByLevel(spaceId: string, level: number): Promise<Word[]> {
    return db.words.where({ spaceId, level }).reverse().sortBy('updatedAt');
  },
};

export const NoteService = SpaceService;
