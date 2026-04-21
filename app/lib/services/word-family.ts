import type { Word } from '~/lib/types';

export function isSingleWord(content: string): boolean {
  return /^[a-zA-Z]+$/.test(content);
}

export function isBaseWord(word: Word): boolean {
  return isSingleWord(word.content) && !isDerivedWord(word);
}

export function isDerivedWord(word: Word): boolean {
  return word.baseWordId !== undefined && word.baseWordId !== word.id;
}

export function countBaseWords(words: Word[]): number {
  return words.filter((w) => isBaseWord(w)).length;
}

export function filterDerivedWords(words: Word[], baseWordId: string): Word[] {
  return words.filter((w) => w.baseWordId === baseWordId && w.id !== baseWordId);
}
