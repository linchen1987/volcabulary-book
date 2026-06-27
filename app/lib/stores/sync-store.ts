import { toast } from 'sonner';
import { create } from 'zustand';
import { STORAGE_KEYS } from '~/lib/constants';
import { FsService } from '~/lib/services/fs-service';
import { SyncService } from '~/lib/services/sync/service';

/** Minimum interval between automatic pulls triggered by sync/ensurePulled. */
const PULL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Decide whether a pull is due given the last pull timestamp.
 * Pure function (testable): pulls if never pulled or the interval has elapsed.
 */
export const isPullStale = (lastPullTime: number | undefined, now: number = Date.now()): boolean =>
  lastPullTime === undefined || now - lastPullTime >= PULL_INTERVAL_MS;

const getPullTimeStorageKey = (spaceId: string) =>
  `${STORAGE_KEYS.LAST_PULL_TIME_PREFIX}${spaceId}`;

// In-memory cache of last pull time per space, backed by sessionStorage for
// persistence across in-session reloads.
const lastPullTimes = new Map<string, number>();

const getLastPullTime = (spaceId: string): number | undefined => {
  const cached = lastPullTimes.get(spaceId);
  if (cached !== undefined) return cached;
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(getPullTimeStorageKey(spaceId));
    if (stored) {
      const time = parseInt(stored, 10);
      if (!Number.isNaN(time)) {
        lastPullTimes.set(spaceId, time);
        return time;
      }
    }
  }
  return undefined;
};

const setLastPullTime = (spaceId: string) => {
  const time = Date.now();
  lastPullTimes.set(spaceId, time);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(getPullTimeStorageKey(spaceId), String(time));
  }
};

const shouldPullBeforePush = (spaceId: string): boolean => isPullStale(getLastPullTime(spaceId));

interface SyncState {
  isSyncing: boolean;
  spaceId: string | null;
  setSyncing: (isSyncing: boolean, spaceId?: string) => void;
  syncPush: (
    spaceId: string,
    options?: { showToast?: boolean; skipPull?: boolean },
    onSyncComplete?: () => Promise<void>,
  ) => Promise<void>;
  syncPull: (spaceId: string, onSyncComplete?: () => Promise<void>) => Promise<void>;
  ensurePulled: (spaceId: string, onSyncComplete?: () => Promise<void>) => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  spaceId: null,
  setSyncing: (isSyncing, spaceId) => set({ isSyncing, spaceId: spaceId || null }),
  syncPush: async (
    spaceId: string,
    options = { showToast: false, skipPull: false },
    onSyncComplete?: () => Promise<void>,
  ) => {
    if (!FsService.isConfigured()) return;

    const { isSyncing } = get();
    if (isSyncing) return;

    set({ isSyncing: true, spaceId });
    try {
      if (!options.skipPull && shouldPullBeforePush(spaceId)) {
        await SyncService.syncSpace(spaceId);
        setLastPullTime(spaceId);
        await onSyncComplete?.();
        if (options.showToast) {
          toast.success('同步成功');
        }
      } else {
        await SyncService.push(spaceId);
        if (options.showToast) {
          toast.success('推送成功');
        }
      }
    } catch (e) {
      console.error('Sync error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      toast.error(`同步失败: ${errorMessage}`);
    } finally {
      set({ isSyncing: false, spaceId: null });
    }
  },
  syncPull: async (spaceId: string, onSyncComplete?: () => Promise<void>) => {
    if (!FsService.isConfigured()) return;

    const { isSyncing } = get();
    if (isSyncing) return;

    set({ isSyncing: true, spaceId });
    try {
      await SyncService.pull(spaceId);
      setLastPullTime(spaceId);
      await onSyncComplete?.();
      toast.success('拉取成功');
    } catch (e) {
      console.error('Pull error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      toast.error(`拉取失败: ${errorMessage}`);
    } finally {
      set({ isSyncing: false, spaceId: null });
    }
  },
  ensurePulled: async (spaceId: string, onSyncComplete?: () => Promise<void>) => {
    if (!shouldPullBeforePush(spaceId)) {
      return true;
    }

    try {
      await SyncService.pull(spaceId);
      setLastPullTime(spaceId);
      await onSyncComplete?.();
      toast.success('数据拉取成功');
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      console.error('Auto pull error:', e);
      toast.error(`自动拉取失败: ${errorMessage}`);
      return false;
    }
  },
}));
