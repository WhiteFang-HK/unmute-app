// Phone push notifications (US-M16-03).
// Loaded lazily so the app still runs where push isn't available
// (web, simulators, Expo Go on Android since SDK 53).
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { supabase } from './supabase';

type NotificationsModule = typeof import('expo-notifications');

export type PushStatus = 'on' | 'denied' | 'unsupported' | 'needs-setup' | 'off';

let mod: NotificationsModule | null | undefined;
let currentToken: string | null = null;

function load(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  const expoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'web' || !Device.isDevice || expoGoAndroid) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    mod = null;
  }
  return mod;
}

function projectId(): string | undefined {
  return Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
}

/** Where push stands right now, without asking the member anything. */
export async function pushStatus(): Promise<PushStatus> {
  const N = load();
  if (!N) return 'unsupported';
  if (!projectId()) return 'needs-setup';
  const { status } = await N.getPermissionsAsync();
  if (status === 'denied') return 'denied';
  return status === 'granted' ? 'on' : 'off';
}

/**
 * Registers this phone for push. `ask` = show the system permission prompt
 * if the member hasn't answered yet (only after they tap a button).
 */
export async function registerForPush(ask: boolean): Promise<PushStatus> {
  const N = load();
  if (!N) return 'unsupported';
  const id = projectId();
  if (!id) return 'needs-setup';
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', { name: 'UNMUTE', importance: N.AndroidImportance.DEFAULT });
    }
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted' && ask) ({ status } = await N.requestPermissionsAsync());
    if (status !== 'granted') return status === 'denied' ? 'denied' : 'off';
    const { data } = await N.getExpoPushTokenAsync({ projectId: id });
    currentToken = data;
    await supabase.rpc('register_push_token', { p_token: data, p_platform: Platform.OS });
    return 'on';
  } catch {
    return 'unsupported';
  }
}

/** Called on sign-out so this phone stops receiving the member's notifications. */
export async function unregisterPush() {
  if (!currentToken) return;
  await supabase.rpc('remove_push_token', { p_token: currentToken });
  currentToken = null;
}

/** Opens the right screen when a phone notification is tapped. Returns a cleanup function. */
export function listenForTaps(): () => void {
  const N = load();
  if (!N) return () => {};
  const open = (link: unknown) => {
    if (typeof link === 'string' && link.startsWith('/')) router.push(link as never);
  };
  const sub = N.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data?.link));
  return () => sub.remove();
}
