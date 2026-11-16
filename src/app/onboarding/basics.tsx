import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Chip, ErrorText, Eyebrow, Field, Screen, Small, Title, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

const GENDERS = [
  ['prefer_not', 'Prefer not to say'],
  ['woman', 'Woman'],
  ['man', 'Man'],
  ['non_binary', 'Non-binary'],
] as const;
const CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Kolkata', 'Chennai', 'Online only'];

function ageFrom(d: string, m: string, y: string): number | null {
  const day = Number(d), mon = Number(m), yr = Number(y);
  if (!day || !mon || y.length !== 4) return null;
  const dob = new Date(yr, mon - 1, day);
  if (dob.getDate() !== day || dob.getMonth() !== mon - 1) return null;
  const now = new Date();
  let a = now.getFullYear() - yr;
  if (now.getMonth() < mon - 1 || (now.getMonth() === mon - 1 && now.getDate() < day)) a--;
  return a;
}

export default function Basics() {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [gender, setGender] = useState<string>('prefer_not');
  const [city, setCity] = useState('');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = ageFrom(dd, mm, yyyy);
  const nameOk = /^[A-Za-z0-9_ .-]{3,30}$/.test(name.trim());
  const ready = nameOk && age !== null && city !== '';

  async function next() {
    setBusy(true);
    setError(null);
    const dob = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    const { error: e } = await supabase.rpc('complete_basics', {
      p_display_name: name.trim(),
      p_dob: dob,
      p_gender: gender,
      p_city: city,
      p_language: lang,
    });
    setBusy(false);
    if (e?.message.includes('NOT_ELIGIBLE')) return router.replace('/not-eligible');
    if (e) return setError(friendlyError(e));
    await refreshProfile();
    router.replace('/onboarding/stage');
  }

  return (
    <Screen footer={<Button label="Continue" onPress={next} loading={busy} disabled={!ready} />}>
      <View style={{ gap: 18 }}>
        <Eyebrow>Step 2 of 5</Eyebrow>
        <Title>Pick a name. Not your name.</Title>
        <Field
          label="Display name (what members see)"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Monsoon_Reader"
          autoCapitalize="none"
          hint="3–30 letters, numbers or _ . Avoid your real name."
          error={name.length > 0 && !nameOk ? 'Use 3–30 letters, numbers, spaces or _ . -' : null}
        />

        <View style={{ gap: 6 }}>
          <Text style={s.label}>Date of birth</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <DobBox value={dd} onChange={setDd} placeholder="DD" max={2} label="Day" />
            <DobBox value={mm} onChange={setMm} placeholder="MM" max={2} label="Month" />
            <DobBox value={yyyy} onChange={setYyyy} placeholder="YYYY" max={4} label="Year" wide />
          </View>
          {age !== null && age >= 30 ? (
            <Small style={{ color: C.friendship }}>You meet the 30+ requirement. Only your age range is shown.</Small>
          ) : (
            <Small>Kept private. Members only see an age range like 35–40.</Small>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>Gender (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GENDERS.map(([v, l]) => (
              <Chip key={v} label={l} selected={gender === v} onPress={() => setGender(v)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>City</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CITIES.map((c) => (
              <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>App language</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="English" selected={lang === 'en'} onPress={() => setLang('en')} />
            <Chip label="हिन्दी" selected={lang === 'hi'} onPress={() => setLang('hi')} />
          </View>
          {lang === 'hi' ? <Small>Hindi screens are coming in a later version. You&apos;ll see English for now.</Small> : null}
        </View>
        <ErrorText>{error}</ErrorText>
      </View>
    </Screen>
  );
}

function DobBox({
  value,
  onChange,
  placeholder,
  max,
  label,
  wide,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max: number;
  label: string;
  wide?: boolean;
}) {
  return (
    <View style={{ flex: wide ? 1.6 : 1 }}>
      <Field
        label=""
        accessibilityLabel={label}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, max))}
        keyboardType="number-pad"
        placeholder={placeholder}
        maxLength={max}
        style={{ textAlign: 'center', fontFamily: F.bold }}
      />
    </View>
  );
}
