import { type SyncableTableName, TABLE_NAMES } from '~/lib/db';
import type { Space } from '~/lib/types';
import type { SyncableEntity } from './types';

export const getEntitySyncId = (_tableName: SyncableTableName, entity: SyncableEntity): string => {
  return (entity as { id: string }).id;
};

export const getEntitySpaceId = (tableName: SyncableTableName, entity: SyncableEntity): string => {
  if (tableName === TABLE_NAMES.SPACES) {
    return (entity as Space).id;
  }
  return (entity as { spaceId: string }).spaceId;
};
