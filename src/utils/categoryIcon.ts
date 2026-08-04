/**
 * Icons imported from Excel/Font Awesome often land as Private Use Area
 * codepoints (e.g. U+F3E0) that only render with the FA webfont. Without it
 * they show as blank bars. Map those codes — and known slugs — to real emoji.
 */

const FA_TO_EMOJI: Record<number, string> = {
  0xf436: '🐾', // paw
  0xf3a8: '🎨', // palette
  0xf3e0: '🏠', // home
  0xf52c: '🧪', // flask
  0xf37d: '🍽️', // utensils
  0xf6cd: '🛍️', // shopping-bag
  0xf517: '🔗', // link
  0xfa7a: '💪', // body/health (compat glyph used in import)
  0xf21e: '❤️', // heartbeat
  0xf468: '👤', // user
  0xf469: '👤', // user
  0xf467: '👶', // child
  0xf4b0: '💰', // money-bill
  0xf3d9: '🏙️', // city
  0xf30d: '🌍', // globe
  0xf4c8: '📈', // chart-line
  0xf522: '🔢', // numbers / redo used as numbers
  0xf500: '💬', // user-friends → phrasal/talk
  0xf455: '👕', // tshirt
  0xf4f0: '📰', // newspaper
  0xf4bb: '💻', // laptop
  0xf3ae: '🎮', // gamepad
  0xf4bc: '💼', // briefcase
  0xf0c0: '👥', // users
  0xf007: '👤', // user
  0xf015: '🏠', // home (alt)
  0xf1fc: '🎨', // paint-brush
  0xf0f0: '🩺', // user-md-ish
  0xf0ad: '🔧', // wrench
  0xf1b2: '🎲', // cube
  0xf02d: '📚', // book
  0xf086: '💬', // comments
  0xf19c: '🏛️', // university
  0xf072: '✈️', // plane
  0xf207: '🚌', // bus
  0xf1ae: '🧒', // child
};

const SLUG_TO_EMOJI: Record<string, string> = {
  'useful-adjectives': '✨',
  'animals-nature': '🐾',
  'art-literature': '🎨',
  house: '🏠',
  science: '🧪',
  'food-drink': '🍽️',
  shopping: '🛍️',
  'linking-opinion': '🔗',
  'body-health': '💪',
  'family-people': '👨‍👩‍👧',
  finance: '💰',
  'places-city': '🏙️',
  environment: '🌍',
  business: '📈',
  'numbers-time': '🔢',
  'phrasal-verbs': '💬',
  clothes: '👕',
  'daily-routine': '⏰',
  'feelings-relationships': '❤️',
  'society-news': '📰',
  technology: '💻',
  'free-time': '🎮',
  'work-study': '💼',
  'travel-transport': '✈️',
};

function codePointOf(char: string): number {
  return char.codePointAt(0) ?? 0;
}

/** True when the string relies on Font Awesome / PUA glyphs that won't show. */
export function isBrokenIcon(icon?: string | null): boolean {
  if (!icon) return true;
  for (const char of icon) {
    const cp = codePointOf(char);
    // Private Use Area + CJK Compatibility Ideographs (FA-like imports)
    if ((cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf900 && cp <= 0xfaff)) {
      return true;
    }
  }
  return false;
}

function mapFaSequence(icon: string): string | null {
  const chars = [...icon].filter((c) => c !== '\u200d' && c !== '\ufe0f');
  if (chars.length === 0) return null;

  // Family-style FA sequence → family emoji
  if (chars.length >= 2 && chars.every((c) => FA_TO_EMOJI[codePointOf(c)])) {
    if (chars.some((c) => [0xf468, 0xf469, 0xf467].includes(codePointOf(c)))) {
      return '👨‍👩‍👧';
    }
  }

  const mapped = FA_TO_EMOJI[codePointOf(chars[0])];
  return mapped ?? null;
}

export function categoryIcon(
  icon?: string | null,
  slug?: string,
  fallback = '📁',
): string {
  if (icon && !isBrokenIcon(icon)) return icon;

  if (icon) {
    const fromFa = mapFaSequence(icon);
    if (fromFa) return fromFa;
  }

  if (slug && SLUG_TO_EMOJI[slug]) return SLUG_TO_EMOJI[slug];

  return fallback;
}
