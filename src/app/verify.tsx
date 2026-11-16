import { Redirect } from 'expo-router';

// Email codes are switched off in this test version; sign-in uses email + password.
export default function Verify() {
  return <Redirect href="/sign-in" />;
}
