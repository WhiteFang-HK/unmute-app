import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.ink, card: C.ink, text: C.text, primary: C.ember, border: C.line },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <AuthProvider>{fontsLoaded ? <Routes /> : <Loading />}</AuthProvider>
    </ThemeProvider>
  );
}

function Routes() {
  const { ready, session, profile } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <Loading />;

  const signedIn = Boolean(session);
  const onboarded = profile?.onboarding_step === 'done';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ink } }}>
      <Stack.Screen name="index" />
      {/* Shown only until .env.local is filled in */}
      <Stack.Protected guard={!isConfigured}>
        <Stack.Screen name="setup-needed" />
      </Stack.Protected>

      <Stack.Protected guard={isConfigured && !signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="verify" />
      </Stack.Protected>

      <Stack.Protected guard={isConfigured && signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={isConfigured && signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="requests" />
        <Stack.Screen name="dating-policy" />
        <Stack.Screen name="report" options={{ presentation: 'modal' }} />
        <Stack.Screen name="care" />
        <Stack.Screen name="article/[id]" />
        <Stack.Screen name="professional/[id]" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="admin" />
      </Stack.Protected>

      {/* Reachable by anyone who failed the 30+ check */}
      <Stack.Screen name="not-eligible" />
    </Stack>
  );
}
