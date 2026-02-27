import type { Space, Word } from '~/lib/types';

export type SyncableEntity = Space | Word;

export const SYNC_ROOT_PATH = '/vocab-book';

export interface BackupData {
  spaces?: Space[];
  words?: Word[];
  version: number;
  exportedAt: number;
}

export interface DataApplyResult {
  success: number;
  skipped: number;
  errors: string[];
}
