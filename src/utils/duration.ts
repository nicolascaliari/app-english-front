import type { MessageKey } from '../i18n/types';

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/**
 * Segundos -> "3 h 20 min". Redondea hacia arriba a minutos: decirle a alguien
 * que espere "0 minutos" es peor que decirle "1 minuto".
 */
export function formatDuration(seconds: number, t: Translate): string {
  const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const h = `${hours} ${t('common.hoursShort')}`;
  const m = `${minutes} ${t('common.minutesShort')}`;

  if (hours && minutes) return `${h} ${m}`;
  if (hours) return h;
  return m;
}
