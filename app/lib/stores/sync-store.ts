import { toast } from 'sonner';
import { create } from 'zustand';
import { FsService } from '~/lib/services/fs-service';
import { SyncService } from '~/lib/services/sync/service';

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
  getHasPulledInSession: (spaceId: string) => boolean;
  ensurePulled: (spaceId: string) => Promise<boolean>;
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
      if (options.skipPull) {
        await SyncService.push(spaceId);
        if (options.showToast) {
          toast.success('推送成功');
        }
      } else {
        const hasPulledInSession = get().getHasPulledInSession(spaceId);
        if (!hasPulledInSession) {
          await SyncService.syncSpace(spaceId);
          await onSyncComplete?.();
          sessionStorage.setItem(`vocab-book:pull:${spaceId}`, 'true');
          if (options.showToast) {
            toast.success('同步成功');
          }
        } else {
          await SyncService.push(spaceId);
          if (options.showToast) {
            toast.success('推送成功');
          }
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
      await onSyncComplete?.();
      sessionStorage.setItem(`vocab-book:pull:${spaceId}`, 'true');
      toast.success('拉取成功');
    } catch (e) {
      console.error('Pull error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      toast.error(`拉取失败: ${errorMessage}`);
    } finally {
      set({ isSyncing: false, spaceId: null });
    }
  },
  getHasPulledInSession: (spaceId: string) => {
    return sessionStorage.getItem(`vocab-book:pull:${spaceId}`) === 'true';
  },
  ensurePulled: async (spaceId: string) => {
    const hasPulled = get().getHasPulledInSession(spaceId);

    if (!hasPulled) {
      try {
        await SyncService.pull(spaceId);
        sessionStorage.setItem(`vocab-book:pull:${spaceId}`, 'true');
        toast.success('数据拉取成功');
        return true;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        console.error('Auto pull error:', e);
        toast.error(`自动拉取失败: ${errorMessage}`);
        return false;
      }
    }
    return true;
  },
}));
