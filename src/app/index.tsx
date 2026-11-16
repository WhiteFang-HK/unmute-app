import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';

// The app's front door: sends each person to the right place.
export default function Index() {
  const { session, profile } = useAuth();
  if (!isConfigured) return <Redirect href="/setup-needed" />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;
  if (profile.status === 'suspended') return <Redirect href="/restricted" />;
  if (profile.onboarding_step !== 'done') return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
