import { Volume2 } from 'lucide-react';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useLocalStorage } from '~/hooks/use-local-storage';
import { STORAGE_KEYS } from '~/lib/constants';
import { TTS_PROVIDER_OPTIONS, type TTSProviderName, TTSService } from '~/lib/services/tts';

export function TTSConfig() {
  const [provider, setProvider] = useLocalStorage(
    STORAGE_KEYS.TTS_PROVIDER,
    'web-speech' as string,
  );

  const handleChange = (value: string) => {
    setProvider(value);
    TTSService.setProvider(value as TTSProviderName);
  };

  return (
    <div className="space-y-4">
      <Label className="block mb-4">朗读引擎</Label>
      <RadioGroup value={provider} onValueChange={handleChange} className="space-y-3">
        {TTS_PROVIDER_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-start space-x-3">
            <RadioGroupItem value={opt.value} id={`tts-${opt.value}`} className="mt-0.5" />
            <div className="space-y-0.5">
              <Label
                htmlFor={`tts-${opt.value}`}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                {opt.label}
              </Label>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
