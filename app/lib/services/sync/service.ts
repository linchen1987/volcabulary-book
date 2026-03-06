import { STORAGE_KEYS } from '~/lib/constants';
import { db } from '~/lib/db';
import { FsService } from '~/lib/services/fs-service';
import { DataService } from '../data-service';
import { type BackupData, SYNC_ROOT_PATH } from './types';

const getLastSyncTimeKey = (spaceId: string) => `${STORAGE_KEYS.LAST_SYNC_TIME_PREFIX}${spaceId}`;

const setLastSyncTime = (spaceId: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(getLastSyncTimeKey(spaceId), Date.now().toString());
  }
};

export const getLastSyncTime = (spaceId: string): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  const time = localStorage.getItem(getLastSyncTimeKey(spaceId));
  return time ? parseInt(time, 10) : undefined;
};

let isInitialized = false;

export const SyncService = {
  async init() {
    if (isInitialized) return;
    await FsService.ensureDir(SYNC_ROOT_PATH);
    isInitialized = true;
  },

  async getRemoteSpaces() {
    try {
      const list = await FsService.list(SYNC_ROOT_PATH);
      const spaces = [];

      for (const item of list) {
        if (item.type === 'directory' && item.basename.startsWith('sp_')) {
          const parts = item.basename.split('_');
          const id = parts[1];
          if (!id) continue;

          let name = item.basename;
          try {
            const dataStr = await FsService.read(`${item.filename}/data.json`);
            const data = JSON.parse(dataStr) as BackupData;
            if (data.spaces && data.spaces.length > 0) {
              name = data.spaces[0].name;
            }
          } catch (_e) {}

          spaces.push({
            id,
            name,
            path: item.filename,
          });
        }
      }
      return spaces;
    } catch (e) {
      console.error('Failed to list remote spaces', e);
      return [];
    }
  },

  async syncSpace(spaceId: string) {
    await SyncService.init();
    const spacePath = `${SYNC_ROOT_PATH}/sp_${spaceId}`;
    await FsService.ensureDir(spacePath);

    await SyncService.pull(spaceId);
    await SyncService.push(spaceId);
    setLastSyncTime(spaceId);
  },

  async pull(spaceId: string) {
    const dataPath = `${SYNC_ROOT_PATH}/sp_${spaceId}/data.json`;
    let remoteData: BackupData | null = null;
    try {
      const content = await FsService.read(dataPath);
      remoteData = JSON.parse(content);
    } catch (_e) {}

    if (!remoteData) return;

    const result = await DataService.applyBackupData(remoteData, {
      spaceId,
    });

    if (result.errors.length > 0) {
      throw new Error(
        `Pull completed with ${result.errors.length} error(s): ${result.errors.join(', ')}`,
      );
    }

    setLastSyncTime(spaceId);
  },

  async push(spaceId: string) {
    await SyncService.init();
    const spacePath = `${SYNC_ROOT_PATH}/sp_${spaceId}`;
    await FsService.ensureDir(spacePath);

    const data = await DataService.fetchBackupData(spaceId);

    const content = JSON.stringify(data);
    const path = `${SYNC_ROOT_PATH}/sp_${spaceId}/data.json`;

    await FsService.write(path, content);

    await db.syncEvents.where('spaceId').equals(spaceId).delete();
    setLastSyncTime(spaceId);
  },
};
