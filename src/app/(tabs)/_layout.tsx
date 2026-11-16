import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';

import type { IconName } from '@/components/ui';
import { C, F } from '@/theme';

const TABS: [string, string, IconName][] = [
  ['home', 'Home', 'home'],
  ['community', 'Community', 'users'],
  ['connect', 'Connect', 'heart'],
  ['inbox', 'Inbox', 'message-circle'],
  ['profile', 'Profile', 'user'],
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: '#6E6962',
        tabBarStyle: { backgroundColor: '#141215', borderTopColor: C.line },
        tabBarLabelStyle: { fontFamily: F.bold, fontSize: 11 },
        sceneStyle: { backgroundColor: C.ink },
      }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title, tabBarIcon: ({ color, size }) => <Feather name={icon} color={color as string} size={size - 2} /> }}
        />
      ))}
    </Tabs>
  );
}
