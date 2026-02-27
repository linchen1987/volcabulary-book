import Dexie, { type Table } from 'dexie';
import { nanoid } from 'nanoid';
import { initSyncTracker } from '~/lib/services/sync/tracker';
import type { Space, SyncEvent, Word } from '~/lib/types';

export const generateId = () => nanoid(12);

export const TABLE_NAMES = {
  SPACES: 'spaces',
  WORDS: 'words',
  SYNC_EVENTS: 'syncEvents',
} as const;

export const SYNCABLE_TABLES = [TABLE_NAMES.SPACES, TABLE_NAMES.WORDS] as const;
export type SyncableTableName = (typeof SYNCABLE_TABLES)[number];

export const ALL_TABLES = Object.values(TABLE_NAMES);
export type AppTableName = (typeof ALL_TABLES)[number];

export class VocabBookDatabase extends Dexie {
  spaces!: Table<Space>;
  words!: Table<Word>;
  syncEvents!: Table<SyncEvent>;

  constructor() {
    super('VocabBookDB');
    this.version(1).stores({
      spaces: 'id, name, createdAt, updatedAt',
      words: 'id, spaceId, content, level, createdAt, updatedAt, [spaceId+updatedAt]',
      syncEvents: 'id, spaceId, createdAt, [spaceId+createdAt]',
    });

    initSyncTracker(this);
  }
}

export const db = new VocabBookDatabase();
