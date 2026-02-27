import { db } from '~/lib/db';

export interface DataToolsProgress {
  status: string;
  progress?: number;
}

export type DataToolsStatusCallback = (progress: DataToolsProgress) => void;

export const DataToolsService = {
  async clearSyncEvents(spaceId?: string, onProgress?: DataToolsStatusCallback): Promise<void> {
    onProgress?.({ status: '' });

    if (spaceId) {
      await db.syncEvents.where('spaceId').equals(spaceId).delete();
      onProgress?.({ status: 'All syncEvents for this space cleared successfully!' });
    } else {
      await db.syncEvents.clear();
      onProgress?.({ status: 'All syncEvents cleared successfully!' });
    }
  },
};
