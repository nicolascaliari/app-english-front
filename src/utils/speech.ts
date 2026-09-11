let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (!isSpeechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices();
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

if (isSpeechSupported()) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  if (cachedVoices.length === 0) refreshVoices();
  const normalized = locale.toLowerCase().replace('_', '-');
  const prefix = normalized.split('-')[0];

  return (
    cachedVoices.find((v) => v.lang?.toLowerCase().replace('_', '-') === normalized) ??
    cachedVoices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
  );
}

interface SpeakOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speaks text using the given BCP-47 locale, preferring a matching system voice.
 */
export function speak(text: string, locale: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = locale;
  utterance.rate = options.rate ?? 0.9;

  const voice = pickVoice(locale);
  if (voice) utterance.voice = voice;

  if (options.onStart) utterance.onstart = options.onStart;
  const stop = () => options.onEnd?.();
  utterance.onend = stop;
  utterance.onerror = stop;

  synth.speak(utterance);
}

/** @deprecated Prefer `speak(text, locale)`. Kept for compatibility. */
export function speakEnglish(text: string, options: SpeakOptions = {}): void {
  speak(text, 'en-US', options);
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function listenOnce(
  locale: string,
  handlers: {
    onResult: (transcript: string) => void;
    onError?: () => void;
    onEnd?: () => void;
  },
): () => void {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    handlers.onError?.();
    handlers.onEnd?.();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = locale;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? '';
    handlers.onResult(transcript);
  };
  recognition.onerror = () => handlers.onError?.();
  recognition.onend = () => handlers.onEnd?.();
  recognition.start();

  return () => {
    try {
      recognition.abort();
    } catch {
      recognition.stop();
    }
  };
}
