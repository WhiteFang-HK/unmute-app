import { Stack } from 'expo-router/stack';

import { C } from '@/theme';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ink } }} />;
}
