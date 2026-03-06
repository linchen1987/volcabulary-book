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
  translation?: string;
  usages?: Array<{
    sentence: string;
    translation?: string;
  }>;
  level: number;
  phonetic?: string;
  audioUrl?: string;
  relatedWordIds?: string[];
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
