import { WebSpeechTTSProvider } from './providers/web-speech';
import type { TTSProvider, TTSSpeakOptions } from './types';

let currentProvider: TTSProvider = new WebSpeechTTSProvider();

export const TTSService = {
  speak(text: string, options?: TTSSpeakOptions): Promise<void> {
    return currentProvider.speak(text, options);
  },

  stop(): void {
    currentProvider.stop();
  },

  setProvider(provider: TTSProvider): void {
    currentProvider.stop();
    currentProvider = provider;
  },

  getProvider(): TTSProvider {
    return currentProvider;
  },
};

export type { TTSProvider, TTSSpeakOptions };
