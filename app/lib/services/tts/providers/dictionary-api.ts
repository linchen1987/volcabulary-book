import type { AudioUrlCache, TTSProvider, TTSSpeakOptions } from '../types';

export class DictionaryApiTTSProvider implements TTSProvider {
  readonly name = 'dictionary-api';

  private currentAudio: HTMLAudioElement | null = null;
  private cache: AudioUrlCache;

  constructor(cache: AudioUrlCache) {
    this.cache = cache;
  }

  private normalize(word: string): string {
    return word.toLowerCase().trim();
  }

  private async fetchAudioUrl(word: string): Promise<string | null> {
    const normalized = this.normalize(word);
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
      );
      if (!response.ok) return null;

      const data = await response.json();
      if (!Array.isArray(data)) return null;

      for (const entry of data as Array<{ phonetics?: Array<{ audio?: string }> }>) {
        if (entry.phonetics) {
          for (const p of entry.phonetics) {
            if (p.audio) {
              return p.audio.startsWith('http') ? p.audio : `https:${p.audio}`;
            }
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async speak(text: string, _options?: TTSSpeakOptions): Promise<void> {
    const word = text.trim();
    if (!word) return;

    const normalized = this.normalize(word);
    let audioUrl = await this.cache.get(normalized);

    if (!audioUrl) {
      audioUrl = await this.fetchAudioUrl(word);
      if (audioUrl) {
        await this.cache.set(normalized, audioUrl);
      }
    }

    if (!audioUrl) return;

    this.stop();

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}
