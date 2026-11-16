import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Page wrapper: dark background, safe area, optional scrolling and a footer pinned to the bottom. */
export function Screen({
  children,
  footer,
  scroll = true,
  padded = true,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && s.pad, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && s.pad]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {inner}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({
  title,
  eyebrow,
  back = true,
  icon = 'back',
  right,
  tone = C.ember,
}: {
  title?: string;
  eyebrow?: string;
  back?: boolean;
  icon?: 'back' | 'close';
  right?: ReactNode;
  tone?: string;
}) {
  return (
    <View style={s.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={icon === 'close' ? 'Close' : 'Back'}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={s.iconBtn}>
          <Feather name={icon === 'close' ? 'x' : 'arrow-left'} size={20} color={C.text} />
        </Pressable>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {eyebrow ? <Text style={[s.eyebrow, { color: tone }]}>{eyebrow}</Text> : null}
        {title ? (
          <Text style={s.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Logo({ size = 19 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 }}>
        {[6, 14, 9, 16].map((h, i) => (
          <View key={i} style={{ width: 3, height: h, backgroundColor: C.ember, borderRadius: 2 }} />
        ))}
      </View>
      <Text style={{ fontFamily: F.display, fontSize: size, color: C.text }}>unmute</Text>
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[s.title, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color = C.ember }: { children: ReactNode; color?: string }) {
  return <Text style={[s.eyebrow, { color, textAlign: 'left' }]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, style]}>{children}</Text>;
}

export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.small, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  color = C.ember,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const bg = kind === 'primary' ? color : 'transparent';
  const fg = kind === 'primary' ? C.ink : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: off ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: C.border },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[s.btnText, { color: kind === 'ghost' ? C.soft : fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#6E6962"
        selectionColor={C.ember}
        accessibilityLabel={label || undefined}
        {...props}
        style={[
          s.input,
          props.multiline && { height: 110, paddingTop: 14, textAlignVertical: 'top' },
          error ? { borderColor: C.ember } : null,
          props.style,
        ]}
      />
      {error ? <Text style={[s.small, { color: C.emberLight }]}>{error}</Text> : hint ? <Text style={s.small}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = C.ember,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[s.chipText, selected && { color: C.ink, fontFamily: F.bold }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Toggle({ value, onChange, color = C.ember, label }: { value: boolean; onChange: (v: boolean) => void; color?: string; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[s.track, { backgroundColor: value ? color : C.border, alignItems: value ? 'flex-end' : 'flex-start' }]}>
      <View style={[s.knob, { backgroundColor: value ? C.ink : '#8C877F' }]} />
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.ember} />
    </View>
  );
}

export function Empty({ title, body, icon = 'inbox' }: { title: string; body?: string; icon?: IconName }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
      <Feather name={icon} size={28} color={C.muted} />
      <Text style={[s.body, { fontFamily: F.bold, color: C.text }]}>{title}</Text>
      {body ? <Text style={[s.small, { textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[s.small, { color: C.emberLight }]}>
      {children}
    </Text>
  );
}

export function Avatar({ name, color, size = 48 }: { name?: string | null; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.31,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.42, color: C.ink }}>
        {(name ?? '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function timeAgo(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ink },
  pad: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: F.bold, fontSize: 16, color: C.text },
  eyebrow: { fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  title: { fontFamily: F.display, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: C.text },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.softer },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
  label: { fontFamily: F.bold, fontSize: 14, color: C.text },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    color: C.text,
    fontFamily: F.semi,
    fontSize: 16,
  },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontFamily: F.bold, fontSize: 16 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  chipText: { fontFamily: F.semi, fontSize: 14, color: C.softer },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  knob: { width: 26, height: 26, borderRadius: 13 },
});
