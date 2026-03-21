import type { BackupData } from '~/lib/services/sync/types';
import { DataService } from './data-service';

export const ExportService = {
  async exportData(spaceId?: string): Promise<BackupData> {
    const data = await DataService.fetchBackupData(spaceId);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-book-export${spaceId ? `-${spaceId}` : ''}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return data;
  },
};
