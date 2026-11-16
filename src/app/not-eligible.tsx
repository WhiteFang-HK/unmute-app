import { router } from 'expo-router';

import { Body, Button, Screen, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function NotEligible() {
  return (
    <Screen
      footer={
        <Button
          label="Close"
          kind="secondary"
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }}
        />
      }>
      <Title style={{ marginTop: 40 }}>UNMUTE is for adults 30 and over.</Title>
      <Body style={{ marginTop: 16 }}>
        We built it for people rebuilding life after separation or divorce later in life, so we keep it to members aged
        30 and above. We haven&apos;t saved your date of birth or any other details.
      </Body>
      <Body style={{ marginTop: 12 }}>
        If you&apos;re going through something hard right now, please talk to someone you trust, or call Tele-MANAS on
        14416 (free, 24×7).
      </Body>
    </Screen>
  );
}
