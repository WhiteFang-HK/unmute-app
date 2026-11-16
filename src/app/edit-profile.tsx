import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Field, Header, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ bio: bio.trim() || null, city: city.trim() || null }).eq('id', profile!.id);
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    await refreshProfile();
    router.back();
  }

  return (
    <Screen footer={<Button label="Save" onPress={save} loading={busy} />}>
      <Header title="Edit profile" />
      <View style={{ gap: 18, marginTop: 8 }}>
        <Field
          label="About you"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={300}
          placeholder="A few lines about what you enjoy and what you're looking for here."
          hint={`${bio.length}/300 · Don't include phone numbers, social handles or your ex's details.`}
        />
        <Field label="City" value={city} onChangeText={setCity} placeholder="Bengaluru" />
        <ErrorText>{err}</ErrorText>
      </View>
    </Screen>
  );
}
