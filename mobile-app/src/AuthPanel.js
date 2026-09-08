import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth, useClerk, useSignIn, useSignUp, useSSO, useUser } from '@clerk/expo';
import { theme } from './theme';

function fieldError(errors, key) {
  const value = errors?.fields?.[key];
  return value?.message || '';
}

function friendlyAuthError(error, fallback) {
  const message = String(error?.message || error || '');
  if (/verification strategy is not valid/i.test(message) || /strategy.*not valid/i.test(message)) {
    return 'THIS ACCOUNT USES GOOGLE. CONTINUE WITH GOOGLE ABOVE.';
  }
  if (/password.*not.*found|password.*not.*set|no password/i.test(message)) {
    return 'THIS ACCOUNT DOES NOT USE A PASSWORD. CONTINUE WITH GOOGLE ABOVE.';
  }
  return message || fallback;
}

function InlineError({ children }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

function Field({ label, value, onChangeText, secureTextEntry = false, keyboardType = 'default', autoComplete }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        placeholderTextColor="#55524C"
        style={styles.input}
      />
    </View>
  );
}

function Action({ label, onPress, disabled = false, quiet = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.action, quiet && styles.actionQuiet, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={[styles.actionText, quiet && styles.actionQuietText]}>{label}</Text>
    </Pressable>
  );
}

function GoogleAction({ disabled = false }) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const connectGoogle = async () => {
    setMessage('');
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: 'parallelvision://sso-callback',
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        setMessage('GOOGLE SIGN-IN NEEDS ONE MORE VERIFICATION STEP.');
      }
    } catch (error) {
      setMessage(friendlyAuthError(error, 'GOOGLE SIGN-IN IS UNAVAILABLE RIGHT NOW.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={connectGoogle}
        disabled={disabled || busy}
        style={({ pressed }) => [styles.googleAction, (disabled || busy) && styles.disabled, pressed && !disabled && !busy && styles.pressed]}
      >
        <Text style={styles.googleMark}>G</Text>
        <Text style={styles.googleText}>{busy ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}</Text>
      </Pressable>
      <InlineError>{message}</InlineError>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
}

function SignedInPanel() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || 'SIGNED IN';
  const email = user?.primaryEmailAddress?.emailAddress || '';

  return (
    <View style={styles.accountCard}>
      <Text style={styles.eyebrow}>ACCOUNT ACTIVE</Text>
      <Text style={styles.name}>{String(name).toUpperCase()}</Text>
      {!!email && email !== name ? <Text style={styles.email}>{email}</Text> : null}
      <View style={styles.rule} />
      <Text style={styles.copy}>Your Parallel Vision identity is active on this device.</Text>
      <Action label="SIGN OUT" quiet onPress={() => signOut()} />
    </View>
  );
}

function SignInPanel({ onSwitch }) {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const busy = fetchStatus === 'fetching';
  const needsCode = signIn.status === 'needs_client_trust';

  const submit = async () => {
    setMessage('');
    const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setMessage(friendlyAuthError(error, 'UNABLE TO SIGN IN.'));
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: () => {} });
      return;
    }
    if (signIn.status === 'needs_client_trust') {
      const emailFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code');
      if (emailFactor) await signIn.mfa.sendEmailCode();
      return;
    }
    if (signIn.status === 'needs_second_factor') {
      setMessage('THIS ACCOUNT REQUIRES AN ADDITIONAL VERIFICATION METHOD.');
    }
  };

  const verify = async () => {
    setMessage('');
    await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (signIn.status === 'complete') await signIn.finalize({ navigate: () => {} });
  };

  if (needsCode) {
    return (
      <View style={styles.accountCard}>
        <Text style={styles.eyebrow}>DEVICE VERIFICATION</Text>
        <Text style={styles.title}>CHECK YOUR EMAIL</Text>
        <Text style={styles.copy}>Enter the verification code Clerk sent for this device.</Text>
        <Field label="CODE" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
        <InlineError>{fieldError(errors, 'code') || message}</InlineError>
        <Action label={busy ? 'VERIFYING…' : 'VERIFY DEVICE'} disabled={busy || !code.trim()} onPress={verify} />
        <Action label="SEND A NEW CODE" quiet onPress={() => signIn.mfa.sendEmailCode()} />
        <Action label="START OVER" quiet onPress={() => signIn.reset()} />
      </View>
    );
  }

  return (
    <View style={styles.accountCard}>
      <Text style={styles.eyebrow}>PARALLEL VISION ID</Text>
      <Text style={styles.title}>SIGN IN</Text>
      <Text style={styles.copy}>Enter the same identity you use on Parallel Vision.</Text>
      <GoogleAction disabled={busy} />
      <Field label="EMAIL" value={emailAddress} onChangeText={setEmailAddress} keyboardType="email-address" autoComplete="email" />
      <InlineError>{fieldError(errors, 'identifier')}</InlineError>
      <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <InlineError>{fieldError(errors, 'password') || message}</InlineError>
      <Action label={busy ? 'CONNECTING…' : 'SIGN IN'} disabled={busy || !emailAddress.trim() || !password} onPress={submit} />
      <Pressable onPress={onSwitch} style={({ pressed }) => [styles.createLink, pressed && styles.pressed]}>
        <Text style={styles.createLinkText}>NEW HERE? CREATE ACCOUNT</Text>
      </Pressable>
    </View>
  );
}

function SignUpPanel({ onSwitch }) {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const busy = fetchStatus === 'fetching';
  const needsCode = signUp.status === 'missing_requirements' && signUp.unverifiedFields?.includes('email_address') && signUp.missingFields?.length === 0;

  const submit = async () => {
    setMessage('');
    const { error } = await signUp.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setMessage(friendlyAuthError(error, 'UNABLE TO CREATE ACCOUNT.'));
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const verify = async () => {
    setMessage('');
    await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (signUp.status === 'complete') await signUp.finalize({ navigate: () => {} });
  };

  if (signUp.status === 'complete' || isSignedIn) return null;

  if (needsCode) {
    return (
      <View style={styles.accountCard}>
        <Text style={styles.eyebrow}>VERIFY ACCOUNT</Text>
        <Text style={styles.title}>CHECK YOUR EMAIL</Text>
        <Text style={styles.copy}>Enter the code sent to {emailAddress.trim()}.</Text>
        <Field label="CODE" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
        <InlineError>{fieldError(errors, 'code') || message}</InlineError>
        <Action label={busy ? 'VERIFYING…' : 'VERIFY & ENTER'} disabled={busy || !code.trim()} onPress={verify} />
        <Action label="SEND A NEW CODE" quiet onPress={() => signUp.verifications.sendEmailCode()} />
      </View>
    );
  }

  return (
    <View style={styles.accountCard}>
      <Text style={styles.eyebrow}>NEW SIGNAL IDENTITY</Text>
      <Text style={styles.title}>CREATE ACCOUNT</Text>
      <Text style={styles.copy}>One identity for Nina continuity, Signal Credits and future access.</Text>
      <GoogleAction disabled={busy} />
      <Field label="EMAIL" value={emailAddress} onChangeText={setEmailAddress} keyboardType="email-address" autoComplete="email" />
      <InlineError>{fieldError(errors, 'emailAddress')}</InlineError>
      <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <InlineError>{fieldError(errors, 'password') || message}</InlineError>
      <View nativeID="clerk-captcha" />
      <Action label={busy ? 'CREATING…' : 'CREATE ACCOUNT'} disabled={busy || !emailAddress.trim() || !password} onPress={submit} />
      <Pressable onPress={onSwitch} style={({ pressed }) => [styles.createLink, pressed && styles.pressed]}>
        <Text style={styles.createLinkText}>I ALREADY HAVE AN ACCOUNT</Text>
      </Pressable>
    </View>
  );
}

export function AuthPanel() {
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState('sign-in');

  const content = useMemo(() => {
    if (!isLoaded) {
      return (
        <View style={styles.accountCard}>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>CONNECTING</Text>
          <Text style={styles.copy}>Reading the secure session on this device.</Text>
        </View>
      );
    }
    if (isSignedIn) return <SignedInPanel />;
    return mode === 'sign-up'
      ? <SignUpPanel onSwitch={() => setMode('sign-in')} />
      : <SignInPanel onSwitch={() => setMode('sign-up')} />;
  }, [isLoaded, isSignedIn, mode]);

  return content;
}

const styles = StyleSheet.create({
  accountCard: { marginTop: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line, borderRadius: 18, backgroundColor: theme.colors.panel },
  eyebrow: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.8, fontWeight: '600' },
  title: { color: theme.colors.text, fontSize: 25, letterSpacing: -0.7, fontWeight: '300', marginTop: 9 },
  name: { color: theme.colors.text, fontSize: 23, letterSpacing: -0.5, fontWeight: '300', marginTop: 11 },
  email: { color: theme.colors.muted, fontSize: 11, marginTop: 4 },
  copy: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  fieldWrap: { marginTop: 11 },
  label: { color: theme.colors.muted, fontSize: 7.5, letterSpacing: 1.5, marginBottom: 6 },
  input: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', borderRadius: 13, paddingHorizontal: 13, color: theme.colors.text, backgroundColor: '#0A0A0A', fontSize: 14 },
  action: { minHeight: 46, borderRadius: 13, backgroundColor: theme.colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14 },
  actionQuiet: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', marginTop: 8 },
  actionText: { color: '#090909', fontSize: 8.5, letterSpacing: 1.7, fontWeight: '700' },
  actionQuietText: { color: theme.colors.text },
  googleAction: { minHeight: 46, borderRadius: 13, backgroundColor: '#F2F0EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
  googleMark: { color: '#111111', fontSize: 15, fontWeight: '700' },
  googleText: { color: '#111111', fontSize: 8.5, letterSpacing: 1.6, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line },
  dividerText: { color: theme.colors.muted, fontSize: 7, letterSpacing: 1.4 },
  createLink: { alignSelf: 'center', paddingVertical: 11, paddingHorizontal: 8 },
  createLinkText: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.7 },
  error: { color: '#D4A49D', fontSize: 9.5, lineHeight: 14, letterSpacing: 0.25, marginTop: 5 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 14 },
});
