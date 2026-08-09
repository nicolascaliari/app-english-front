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
