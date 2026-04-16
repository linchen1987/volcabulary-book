export interface Space {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Word {
  id: string;
  spaceId: string;
  content: string;
  description?: string;
  /** @deprecated Use description field instead. Data should be migrated via settings. */
  translation?: string;
  /** @deprecated Use description field instead for 例句/解释/笔记 */
  usages?: Array<{
    sentence: string;
    translation?: string;
  }>;
  level: number;
  phonetic?: string;
  audioUrl?: string;
  relatedWordIds?: string[];
  baseWordId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncEvent {
  id: string;
  spaceId: string;
  entityName: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  createdAt: number;
}
