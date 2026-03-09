import type { Word } from '~/lib/types';
import { cn } from '~/lib/utils';

interface RelatedWordsSelectorProps {
  words: Word[];
  onWordClick?: (wordId: string) => void;
  className?: string;
}

export function RelatedWordsSelector({ words, onWordClick, className }: RelatedWordsSelectorProps) {
  if (words.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {words.map((word) => (
        <button
          key={word.id}
          type="button"
          onClick={() => onWordClick?.(word.id)}
          className={cn(
            'px-2.5 py-1 text-sm bg-primary/10 rounded-full transition-colors',
            onWordClick && 'hover:bg-primary/20 cursor-pointer',
          )}
        >
          {word.content}
        </button>
      ))}
    </div>
  );
}
