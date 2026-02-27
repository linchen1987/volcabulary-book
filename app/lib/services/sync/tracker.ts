import type { Transaction } from 'dexie';
import {
  type AppTableName,
  generateId,
  SYNCABLE_TABLES,
  type SyncableTableName,
  TABLE_NAMES,
  type VocabBookDatabase,
} from '~/lib/db';
import type { SyncEvent } from '~/lib/types';
import type { SyncableEntity } from './types';
import { getEntitySpaceId, getEntitySyncId } from './utils';

const logSyncEvent = (
  db: VocabBookDatabase,
  transaction: Transaction & { source?: string },
  spaceId: string,
  entityName: SyncableTableName,
  entityId: string,
  action: 'create' | 'update' | 'delete',
) => {
  const event: SyncEvent = {
    id: generateId(),
    spaceId,
    entityName,
    entityId,
    action,
    createdAt: Date.now(),
  };

  const SYNC_EVENTS_TABLE: AppTableName = TABLE_NAMES.SYNC_EVENTS;

  let hasSyncEvents = false;
  try {
    transaction.table(SYNC_EVENTS_TABLE);
    hasSyncEvents = true;
  } catch (_e) {
    hasSyncEvents = false;
  }

  if (hasSyncEvents) {
    transaction.table(SYNC_EVENTS_TABLE).add(event);
  } else {
    if (transaction.source !== 'sync') {
      db.syncEvents.add(event).catch((err: Error) => {
        console.error(`Failed to log sync event for ${entityName} ${action}:`, err);
      });
    }
  }
};

const handleHook = (
  db: VocabBookDatabase,
  tableName: SyncableTableName,
  action: 'create' | 'update' | 'delete',
  obj: SyncableEntity,
  transaction: Transaction & { source?: string },
) => {
  if (transaction.source === 'sync') return;

  const entityId = getEntitySyncId(tableName, obj);
  const spaceId = getEntitySpaceId(tableName, obj);

  if (spaceId) {
    logSyncEvent(db, transaction, spaceId, tableName, entityId, action);
  }
};

export const initSyncTracker = (db: VocabBookDatabase) => {
  SYNCABLE_TABLES.forEach((tableName) => {
    db.table(tableName).hook('creating', (_primKey, obj, transaction) => {
      handleHook(db, tableName, 'create', obj as SyncableEntity, transaction);
    });

    db.table(tableName).hook('updating', (_mods, _primKey, obj, transaction) => {
      handleHook(db, tableName, 'update', obj as SyncableEntity, transaction);
    });

    db.table(tableName).hook('deleting', (_primKey, obj, transaction) => {
      handleHook(db, tableName, 'delete', obj as SyncableEntity, transaction);
    });
  });
};
