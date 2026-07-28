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

function pickAmericanVoice(): SpeechSynthesisVoice | undefined {
  if (cachedVoices.length === 0) refreshVoices();
  return (
    cachedVoices.find((v) => v.lang === 'en-US') ??
    cachedVoices.find((v) => v.lang?.toLowerCase().replace('_', '-') === 'en-us') ??
    cachedVoices.find((v) => v.lang?.toLowerCase().startsWith('en'))
  );
}

interface SpeakOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speaks the given text using American English (en-US), preferring a
 * matching system voice when one is available.
 */
export function speakEnglish(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = 'en-US';
  utterance.rate = options.rate ?? 0.9;

  const voice = pickAmericanVoice();
  if (voice) utterance.voice = voice;

  if (options.onStart) utterance.onstart = options.onStart;
  const stop = () => options.onEnd?.();
  utterance.onend = stop;
  utterance.onerror = stop;

  synth.speak(utterance);
}
