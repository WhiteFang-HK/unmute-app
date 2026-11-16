import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { friendlyError } from './supabase';

/**
 * Loads data when the screen comes into view (and again each time you return to it).
 * `fn` should throw on error; the message is turned into plain words.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fnRef.current());
    } catch (e) {
      setError(friendlyError(e));
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { data, error, loaded, refreshing, refresh, reload: load, setData };
}

/** Unwraps a Supabase response, throwing its error. */
export function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
