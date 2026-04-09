import { STORAGE_KEYS } from '~/lib/constants';
import { idbAudioUrlCache } from './cache';
import { DictionaryApiTTSProvider } from './providers/dictionary-api';
import { WebSpeechTTSProvider } from './providers/web-speech';
import type { TTSProvider, TTSSpeakOptions } from './types';

export type TTSProviderName = 'web-speech' | 'dictionary-api';

const providers: Record<TTSProviderName, () => TTSProvider> = {
  'web-speech': () => new WebSpeechTTSProvider(),
  'dictionary-api': () => new DictionaryApiTTSProvider(idbAudioUrlCache),
};

export const TTS_PROVIDER_OPTIONS: {
  value: TTSProviderName;
  label: string;
  description: string;
}[] = [
  {
    value: 'web-speech',
    label: 'Web Speech API',
    description: '浏览器内置语音合成，无需网络',
  },
  {
    value: 'dictionary-api',
    label: 'Free Dictionary API',
    description: '公开字典 API 提供真人发音，需网络',
  },
];

function createProvider(name: TTSProviderName): TTSProvider {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown TTS provider: ${name}`);
  return factory();
}

function loadSavedProviderName(): TTSProviderName {
  if (typeof window === 'undefined') return 'web-speech';
  const saved = localStorage.getItem(STORAGE_KEYS.TTS_PROVIDER);
  if (saved && saved in providers) return saved as TTSProviderName;
  return 'web-speech';
}

let currentProvider: TTSProvider = createProvider(loadSavedProviderName());

export const TTSService = {
  speak(text: string, options?: TTSSpeakOptions): Promise<void> {
    return currentProvider.speak(text, options);
  },

  stop(): void {
    currentProvider.stop();
  },

  setProvider(name: TTSProviderName): void {
    currentProvider.stop();
    currentProvider = createProvider(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TTS_PROVIDER, name);
    }
  },

  getProviderName(): TTSProviderName {
    return currentProvider.name as TTSProviderName;
  },

  getProvider(): TTSProvider {
    return currentProvider;
  },
};

export type { TTSProvider, TTSSpeakOptions };
