export interface TTSSpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface AudioUrlCache {
  get(word: string): Promise<string | null>;
  set(word: string, audioUrl: string): Promise<void>;
}

export interface TTSProvider {
  readonly name: string;
  speak(text: string, options?: TTSSpeakOptions): Promise<void>;
  stop(): void;
}
