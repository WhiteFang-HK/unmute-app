import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(url && key);

// Placeholders keep the app from crashing before .env.local is filled in;
// the app shows a "finish setup" screen in that case.
export const supabase = createClient(url ?? 'https://example.supabase.co', key ?? 'missing-key', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the sign-in fresh only while the app is open.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Turns database error codes into words a member can act on.
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  const map: Record<string, string> = {
    NOT_ELIGIBLE: 'UNMUTE is for adults 30 and over.',
    INVALID_DOB: 'Please check your date of birth.',
    DATING_NOT_ELIGIBLE: 'Dating opens once you are legally separated, divorced, or your divorce is underway.',
    RATE_LIMIT: "You've sent a lot of requests today. Try again tomorrow.",
    BLOCKED: "You can't contact this member.",
    NOT_ACTIVE: 'Your account is restricted right now.',
    duplicate: 'That name is taken. Try another.',
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  if (msg.includes('Network request failed')) return 'No connection. Check your internet and try again.';
  return msg;
}
