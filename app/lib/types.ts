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
  translations?: string[];
  usages?: Usage[];
  level: number;
  phonetic?: string;
  audioUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Usage {
  sentence: string;
  translation?: string;
}

export interface SyncEvent {
  id: string;
  spaceId: string;
  entityName: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  createdAt: number;
}
