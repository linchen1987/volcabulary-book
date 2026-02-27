import { db, type SyncableTableName, TABLE_NAMES } from '~/lib/db';
import type { BackupData, DataApplyResult, SyncableEntity } from '~/lib/services/sync/types';
import { getEntitySyncId } from './sync/utils';

export const DataService = {
  async fetchBackupData(spaceId?: string): Promise<BackupData> {
    if (spaceId) {
      const [spaces, words] = await Promise.all([
        db.spaces.where('id').equals(spaceId).toArray(),
        db.words.where('spaceId').equals(spaceId).toArray(),
      ]);

      return {
        spaces,
        words,
        version: 1,
        exportedAt: Date.now(),
      };
    }

    const [spaces, words] = await Promise.all([db.spaces.toArray(), db.words.toArray()]);

    return {
      spaces,
      words,
      version: 1,
      exportedAt: Date.now(),
    };
  },

  prepareEntityForStorage<T extends SyncableEntity>(_tableName: SyncableTableName, entity: T): T {
    return entity;
  },

  async applyBackupData(
    data: BackupData,
    options: { spaceId?: string } = {},
  ): Promise<DataApplyResult> {
    console.log('[applyBackupData] Starting');
    const totalResult: DataApplyResult = { success: 0, skipped: 0, errors: [] };

    const addError = (message: string) => {
      totalResult.errors.push(message);
      console.error('applyBackupData:', message);
    };

    try {
      console.log('[applyBackupData] Fetching sync events');
      const syncEvents = options.spaceId
        ? await db.syncEvents.where('spaceId').equals(options.spaceId).toArray()
        : [];

      console.log('[applyBackupData] Starting transaction');
      await db.transaction('rw', [db.spaces, db.words], async (transaction) => {
        (transaction as { source?: string }).source = 'sync';

        const validSpaceIds = new Set<string>(
          (await db.spaces.toCollection().primaryKeys()) as string[],
        );

        const tables: Array<{ name: SyncableTableName; data: SyncableEntity[] }> = [
          { name: TABLE_NAMES.SPACES, data: (data.spaces || []) as SyncableEntity[] },
          { name: TABLE_NAMES.WORDS, data: (data.words || []) as SyncableEntity[] },
        ];

        for (const { name, data: remoteList } of tables) {
          try {
            console.log(`[applyBackupData] Processing table: ${name}, count: ${remoteList.length}`);

            const localList = options.spaceId
              ? name === TABLE_NAMES.SPACES
                ? await db.spaces.where('id').equals(options.spaceId).toArray()
                : await db.table(name).where('spaceId').equals(options.spaceId).toArray()
              : await db.table(name).toArray();

            const remoteMap = new Map<string, SyncableEntity>();
            for (const item of remoteList) {
              try {
                remoteMap.set(getEntitySyncId(name, item), item);
              } catch (e) {
                addError(
                  `[${name}] Failed to map remote ID: ${e instanceof Error ? e.message : 'Unknown error'}`,
                );
              }
            }

            const localMap = new Map<string, SyncableEntity>();
            for (const item of localList) {
              try {
                localMap.set(getEntitySyncId(name, item as SyncableEntity), item as SyncableEntity);
              } catch (e) {
                addError(
                  `[${name}] Failed to map local ID: ${e instanceof Error ? e.message : 'Unknown error'}`,
                );
              }
            }

            let tableSuccess = 0;
            let tableSkipped = 0;

            for (const rawRItem of remoteList) {
              try {
                const rItem = this.prepareEntityForStorage(name, rawRItem);
                const rId = getEntitySyncId(name, rItem);
                const lItem = localMap.get(rId);

                if (name !== TABLE_NAMES.SPACES) {
                  const spId = (rItem as { spaceId?: string }).spaceId;
                  if (spId && !validSpaceIds.has(spId)) {
                    tableSkipped++;
                    continue;
                  }
                }

                if (lItem) {
                  if ('updatedAt' in rItem && 'updatedAt' in lItem) {
                    const rUpdatedAt = (rItem as { updatedAt: number }).updatedAt;
                    const lUpdatedAt = (lItem as { updatedAt: number }).updatedAt;
                    if (rUpdatedAt > lUpdatedAt) {
                      await db.table(name).put(rItem);
                      tableSuccess++;
                    } else {
                      tableSkipped++;
                    }
                  } else {
                    await db.table(name).put(rItem);
                    tableSuccess++;
                  }
                } else {
                  const deletedLocally = syncEvents.some(
                    (e) => e.entityId === rId && e.action === 'delete' && e.entityName === name,
                  );
                  if (!deletedLocally) {
                    await db.table(name).put(rItem);
                    if (name === TABLE_NAMES.SPACES) {
                      validSpaceIds.add(rId);
                    }
                    tableSuccess++;
                  } else {
                    tableSkipped++;
                  }
                }
              } catch (e) {
                addError(
                  `[${name}] Failed to process item: ${e instanceof Error ? e.message : 'Unknown error'}`,
                );
              }
            }

            for (const lItem of localList) {
              try {
                const lId = getEntitySyncId(name, lItem as SyncableEntity);
                if (!remoteMap.has(lId)) {
                  const createdLocally = syncEvents.some(
                    (e) => e.entityId === lId && e.action === 'create' && e.entityName === name,
                  );
                  if (!createdLocally) {
                    await db.table(name).delete(lId);
                    if (name === TABLE_NAMES.SPACES) {
                      validSpaceIds.delete(lId);
                    }
                  }
                }
              } catch (e) {
                addError(
                  `[${name}] Failed to delete item: ${e instanceof Error ? e.message : 'Unknown error'}`,
                );
              }
            }

            totalResult.success += tableSuccess;
            totalResult.skipped += tableSkipped;
            console.log(`[applyBackupData] Completed ${name}: ${tableSuccess}, ${tableSkipped}`);
          } catch (e) {
            addError(
              `[${name}] Processing failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
            );
          }
        }
      });

      console.log('[applyBackupData] Transaction completed');
    } catch (e) {
      addError(`Transaction failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    return totalResult;
  },
};
