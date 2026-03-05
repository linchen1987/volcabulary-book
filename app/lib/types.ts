export interface Space {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface TranslationGroup {
  id: string;
  translation: string;
  usages?: Array<{
    sentence: string;
    translation?: string;
  }>;
}

export interface Word {
  id: string;
  spaceId: string;
  content: string;
  description?: string;
  translationGroups?: TranslationGroup[];
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
