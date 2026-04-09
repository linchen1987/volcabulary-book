import type { TTSProvider, TTSSpeakOptions } from '../types';

export class WebSpeechTTSProvider implements TTSProvider {
  readonly name = 'web-speech';

  private getSynth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  async speak(text: string, options?: TTSSpeakOptions): Promise<void> {
    const synth = this.getSynth();
    if (!synth) return;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang ?? 'en-US';
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  }

  stop(): void {
    this.getSynth()?.cancel();
  }
}
