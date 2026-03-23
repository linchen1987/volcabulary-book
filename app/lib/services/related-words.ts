import type { Word } from '~/lib/types';

export function addRelation(
  word: Word,
  relatedWord: Word,
): { wordUpdate: Partial<Word>; relatedUpdate: Partial<Word> } | null {
  if (word.id === relatedWord.id) return null;

  const wordIds = new Set(word.relatedWordIds || []);
  const relatedIds = new Set(relatedWord.relatedWordIds || []);

  const alreadyRelated = wordIds.has(relatedWord.id) && relatedIds.has(word.id);
  if (alreadyRelated) return null;

  wordIds.add(relatedWord.id);
  relatedIds.add(word.id);

  const now = Date.now();
  return {
    wordUpdate: {
      relatedWordIds: Array.from(wordIds),
      updatedAt: now + 1,
    },
    relatedUpdate: {
      relatedWordIds: Array.from(relatedIds),
      updatedAt: now,
    },
  };
}

export function removeRelation(
  word: Word,
  relatedWord: Word,
): { wordUpdate: Partial<Word>; relatedUpdate: Partial<Word> } | null {
  if (!word.relatedWordIds?.length && !relatedWord.relatedWordIds?.length) return null;

  const wordIds = (word.relatedWordIds || []).filter((id) => id !== relatedWord.id);
  const relatedIds = (relatedWord.relatedWordIds || []).filter((id) => id !== word.id);

  const wordChanged = wordIds.length !== (word.relatedWordIds || []).length;
  const relatedChanged = relatedIds.length !== (relatedWord.relatedWordIds || []).length;

  if (!wordChanged && !relatedChanged) return null;

  const now = Date.now();
  return {
    wordUpdate: {
      relatedWordIds: wordIds.length > 0 ? wordIds : undefined,
      updatedAt: now + 1,
    },
    relatedUpdate: {
      relatedWordIds: relatedIds.length > 0 ? relatedIds : undefined,
      updatedAt: now,
    },
  };
}

export function cleanupRelationsOnDelete(
  word: Word,
  relatedWords: Word[],
): Array<{
  id: string;
  update: Partial<Word>;
}> {
  if (!word.relatedWordIds?.length) return [];

  return relatedWords
    .map((rw) => {
      const updatedIds = (rw.relatedWordIds || []).filter((id) => id !== word.id);
      return {
        id: rw.id,
        update: {
          relatedWordIds: updatedIds.length > 0 ? updatedIds : undefined,
          updatedAt: Date.now(),
        },
      };
    })
    .filter((item) => {
      const original = relatedWords.find((rw) => rw.id === item.id);
      return (
        original &&
        item.update.relatedWordIds !==
          (original.relatedWordIds?.length ? original.relatedWordIds : undefined)
      );
    });
}

export function computeRelationDiff(
  currentIds: string[],
  originalIds: string[],
): { toAdd: string[]; toRemove: string[] } {
  const toAdd = currentIds.filter((id) => !originalIds.includes(id));
  const toRemove = originalIds.filter((id) => !currentIds.includes(id));
  return { toAdd, toRemove };
}

export function validateConsistency(words: Word[]): { wordId: string; missingFrom: string[] }[] {
  const wordMap = new Map<string, Word>();
  for (const w of words) {
    wordMap.set(w.id, w);
  }

  const issues: { wordId: string; missingFrom: string[] }[] = [];

  for (const word of words) {
    if (!word.relatedWordIds?.length) continue;
    for (const relId of word.relatedWordIds) {
      const relatedWord = wordMap.get(relId);
      if (!relatedWord) continue;
      if (!relatedWord.relatedWordIds?.includes(word.id)) {
        const existing = issues.find((i) => i.wordId === word.id);
        if (existing) {
          existing.missingFrom.push(relId);
        } else {
          issues.push({ wordId: word.id, missingFrom: [relId] });
        }
      }
    }
  }

  return issues;
}
