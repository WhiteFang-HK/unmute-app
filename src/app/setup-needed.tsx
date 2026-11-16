import { Body, Screen, Small, Title } from '@/components/ui';

export default function SetupNeeded() {
  return (
    <Screen>
      <Title>Almost there.</Title>
      <Body style={{ marginTop: 14 }}>
        The app can&apos;t reach its database yet. Open the file called .env.local in the unmute-app folder and paste in your
        Supabase project URL and publishable key, then restart with npx expo start.
      </Body>
      <Small style={{ marginTop: 14 }}>The setup guide walks through this step by step.</Small>
    </Screen>
  );
}
