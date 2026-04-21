import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '~/lib/constants';

interface QuizConfig {
  selectedLevel: number | 'all';
  typeFilter: 'all' | 'word' | 'phrase' | 'base-word';
  quizCount: number;
}

const DEFAULT_CONFIG: QuizConfig = {
  selectedLevel: 'all',
  typeFilter: 'all',
  quizCount: 10,
};

function readConfig(): QuizConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_CONFIG);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function persist(config: QuizConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.QUIZ_CONFIG, JSON.stringify(config));
}

export function useQuizConfig() {
  const [config, setConfig] = useState(readConfig);

  const update = useCallback((partial: Partial<QuizConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, []);

  return {
    selectedLevel: config.selectedLevel,
    setSelectedLevel: (selectedLevel: number | 'all') => update({ selectedLevel }),
    typeFilter: config.typeFilter,
    setTypeFilter: (typeFilter: 'all' | 'word' | 'phrase' | 'base-word') => update({ typeFilter }),
    quizCount: config.quizCount,
    setQuizCount: (quizCount: number) => update({ quizCount }),
  } as const;
}
