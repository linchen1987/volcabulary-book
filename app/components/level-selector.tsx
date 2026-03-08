import { Circle } from 'lucide-react';
import { cn } from '~/lib/utils';

const LEVEL_COLORS = [
  { text: 'text-green-500 dark:text-green-400', border: 'border-green-500 dark:border-green-400' },
  { text: 'text-cyan-500 dark:text-cyan-400', border: 'border-cyan-500 dark:border-cyan-400' },
  { text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500 dark:border-blue-400' },
  {
    text: 'text-yellow-500 dark:text-yellow-400',
    border: 'border-yellow-500 dark:border-yellow-400',
  },
  {
    text: 'text-orange-500 dark:text-orange-400',
    border: 'border-orange-500 dark:border-orange-400',
  },
  { text: 'text-red-500 dark:text-red-400', border: 'border-red-500 dark:border-red-400' },
  {
    text: 'text-purple-500 dark:text-purple-400',
    border: 'border-purple-500 dark:border-purple-400',
  },
] as const;

interface LevelSelectorProps {
  value: number;
  onChange?: (level: number) => void;
  disabled?: boolean;
  className?: string;
}

export function LevelSelector({ value, onChange, disabled, className }: LevelSelectorProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {[1, 2, 3, 4, 5, 6, 7].map((level) => {
        const isSelected = value === level;
        const colorConfig = LEVEL_COLORS[level - 1];
        const isInteractive = onChange && !disabled;

        return (
          <button
            key={level}
            type="button"
            onClick={() => isInteractive && onChange(level)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1 transition-all',
              isInteractive && 'cursor-pointer hover:scale-110',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isSelected ? (
              <Circle
                className={cn('w-5 h-5 transition-all', colorConfig.text)}
                fill="currentColor"
                strokeWidth={0}
              />
            ) : (
              <Circle
                className={cn(
                  'w-5 h-5 transition-all',
                  colorConfig.text,
                  isInteractive ? 'opacity-40 hover:opacity-70' : 'opacity-30',
                )}
                strokeWidth={2}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
