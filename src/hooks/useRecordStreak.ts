import { useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { localDateString, normalizeDateOnly } from '../utils/date';

export function useRecordStreak() {
  const { user, updateStreak } = useAuth();

  return useCallback(async () => {
    if (!user) return;

    const today = localDateString();
    if (normalizeDateOnly(user.lastStreakDate) === today) return;

    try {
      const result = await api.recordStreak({ date: today });
      updateStreak(result.streakCount, result.lastStreakDate);
    } catch (e) {
      console.warn('Failed to record streak', e);
    }
  }, [user, updateStreak]);
}
