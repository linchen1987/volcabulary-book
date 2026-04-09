import { Volume2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { TTSService } from '~/lib/services/tts';
import { cn } from '~/lib/utils';

interface SpeakButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function SpeakButton({ text, className, size = 'sm' }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const abortRef = useRef(false);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      abortRef.current = true;
      TTSService.stop();
      setIsSpeaking(false);
      return;
    }

    abortRef.current = false;
    setIsSpeaking(true);
    TTSService.speak(text).then(() => {
      if (!abortRef.current) {
        setIsSpeaking(false);
      }
    });
  }, [text, isSpeaking]);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={cn(
        'shrink-0 text-muted-foreground/40 hover:text-primary transition-colors p-0.5 rounded',
        isSpeaking && 'text-primary',
        className,
      )}
      title={isSpeaking ? '停止朗读' : '朗读'}
    >
      <Volume2 className={cn(iconSize, isSpeaking && 'animate-pulse')} />
    </button>
  );
}
