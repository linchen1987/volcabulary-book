import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '~/lib/constants';

interface ListViewConfig {
  sort: string;
  showTranslation: boolean;
  showLevel: boolean;
  showRelatedWords: boolean;
}

const DEFAULT_CONFIG: ListViewConfig = {
  sort: 'updatedAt-desc',
  showTranslation: false,
  showLevel: false,
  showRelatedWords: false,
};

function readConfig(): ListViewConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const raw = localStorage.getItem(STORAGE_KEYS.LIST_VIEW_CONFIG);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function persist(config: ListViewConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LIST_VIEW_CONFIG, JSON.stringify(config));
}

export function useListViewConfig() {
  const [config, setConfig] = useState(readConfig);

  const update = useCallback((partial: Partial<ListViewConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, []);

  return {
    sort: config.sort,
    setSort: (sort: string) => update({ sort }),
    showTranslation: config.showTranslation,
    setShowTranslation: (showTranslation: boolean) => update({ showTranslation }),
    showLevel: config.showLevel,
    setShowLevel: (showLevel: boolean) => update({ showLevel }),
    showRelatedWords: config.showRelatedWords,
    setShowRelatedWords: (showRelatedWords: boolean) => update({ showRelatedWords }),
  } as const;
}
