import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

// Sends the member to whichever onboarding step they stopped at.
export default function OnboardingStart() {
  const { profile } = useAuth();
  if (!profile) return <Loading />;
  const step = profile.onboarding_step === 'done' ? 'pillars' : profile.onboarding_step;
  return <Redirect href={`/onboarding/${step}`} />;
}
