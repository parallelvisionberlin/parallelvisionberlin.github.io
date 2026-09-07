import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/expo';
import { theme } from './theme';

function fieldError(errors, key) {
  const value = errors?.fields?.[key];
  return value?.message || '';
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
      <Text style={styles.copy}>This native session is stored securely on the device and is available to the Parallel Vision app after restart.</Text>
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
      setMessage(error?.message || 'Unable to sign in.');
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
      setMessage('This account requires an additional verification method not yet enabled in the app.');
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
      <Text style={styles.eyebrow}>PARALLEL VISION ACCOUNT</Text>
      <Text style={styles.title}>SIGN IN</Text>
      <Text style={styles.copy}>Use the same account as parallelvisionlabel.com.</Text>
      <Field label="EMAIL" value={emailAddress} onChangeText={setEmailAddress} keyboardType="email-address" autoComplete="email" />
      <InlineError>{fieldError(errors, 'identifier')}</InlineError>
      <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <InlineError>{fieldError(errors, 'password') || message}</InlineError>
      <Action label={busy ? 'CONNECTING…' : 'SIGN IN'} disabled={busy || !emailAddress.trim() || !password} onPress={submit} />
      <Action label="CREATE ACCOUNT" quiet onPress={onSwitch} />
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
      setMessage(error?.message || 'Unable to create account.');
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
      <Text style={styles.copy}>One account will carry Nina continuity, Signal Credits and future app access.</Text>
      <Field label="EMAIL" value={emailAddress} onChangeText={setEmailAddress} keyboardType="email-address" autoComplete="email" />
      <InlineError>{fieldError(errors, 'emailAddress')}</InlineError>
      <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <InlineError>{fieldError(errors, 'password') || message}</InlineError>
      <View nativeID="clerk-captcha" />
      <Action label={busy ? 'CREATING…' : 'CREATE ACCOUNT'} disabled={busy || !emailAddress.trim() || !password} onPress={submit} />
      <Action label="I ALREADY HAVE AN ACCOUNT" quiet onPress={onSwitch} />
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
  accountCard: { marginTop: 26, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line, borderRadius: 20, backgroundColor: theme.colors.panel },
  eyebrow: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.8, fontWeight: '600' },
  title: { color: theme.colors.text, fontSize: 28, letterSpacing: -0.8, fontWeight: '300', marginTop: 14 },
  name: { color: theme.colors.text, fontSize: 24, letterSpacing: -0.5, fontWeight: '300', marginTop: 14 },
  email: { color: theme.colors.muted, fontSize: 12, marginTop: 5 },
  copy: { color: theme.colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  fieldWrap: { marginTop: 18 },
  label: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.5, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', borderRadius: 14, paddingHorizontal: 14, color: theme.colors.text, backgroundColor: '#0A0A0A', fontSize: 15 },
  action: { minHeight: 50, borderRadius: 14, backgroundColor: theme.colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingHorizontal: 14 },
  actionQuiet: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', marginTop: 10 },
  actionText: { color: '#090909', fontSize: 9, letterSpacing: 1.7, fontWeight: '700' },
  actionQuietText: { color: theme.colors.text },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.7 },
  error: { color: '#D4A49D', fontSize: 11, lineHeight: 16, marginTop: 7 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 16 },
});
