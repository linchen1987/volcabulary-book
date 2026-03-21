import type { BackupData, DataApplyResult } from '~/lib/services/sync/types';
import { DataService } from './data-service';

export const ImportService = {
  async importData(data: BackupData, spaceId?: string): Promise<DataApplyResult> {
    return DataService.applyBackupData(data, { spaceId });
  },
};
