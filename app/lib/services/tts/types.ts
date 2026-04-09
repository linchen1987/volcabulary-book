export interface TTSSpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSProvider {
  readonly name: string;
  speak(text: string, options?: TTSSpeakOptions): Promise<void>;
  stop(): void;
}
