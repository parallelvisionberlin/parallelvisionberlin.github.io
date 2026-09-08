import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth, useClerk, useSignIn, useSignUp, useSSO, useUser } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { theme } from './theme';

WebBrowser.maybeCompleteAuthSession();
export const AUTH_REVISION = 'LOGIN 02';
export const SSO_REDIRECT_URL = AuthSession.makeRedirectUri({ scheme: 'parallelvision', path: 'sso-callback' });

export function authError(error, fallback = 'Unable to sign in. Please try again.') {
  const detail = error?.errors?.[0] || error;
  const message = String(detail?.longMessage || detail?.message || '');
  const code = String(detail?.code || '');
  if (/verification strategy|strategy.*not valid/i.test(message + ' ' + code)) {
    return 'This sign-in method is not available for this account. Try Google or an email code.';
  }
  if (/password.*not.*found|password.*not.*set|no password/i.test(message)) {
    return 'Password sign-in is not available for this account. Try Google or an email code.';
  }
  if (/redirect.*(allow|valid)|allow.*redirect/i.test(message)) {
    return 'Google cannot return to this app yet. The mobile callback must be enabled in Clerk.';
  }
  return message || fallback;
}

async function checked(promise) {
  const result = await promise;
  if (result?.error) throw result.error;
  return result;
}

function Action({ children, onPress, busy = false, disabled = false, secondary = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [styles.action, secondary && styles.secondary, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={secondary ? '#F2EFE9' : '#080808'} /> :
        <Text style={[styles.actionText, secondary && styles.secondaryText]}>{children}</Text>}
    </Pressable>
  );
}

function Field({ label, value, onChangeText, password = false, code = false, onSubmitEditing }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
        secureTextEntry={password} autoCapitalize="none" autoCorrect={false}
        keyboardType={code ? 'number-pad' : password ? 'default' : 'email-address'}
        autoComplete={code ? 'one-time-code' : password ? 'current-password' : 'email'}
        textContentType={code ? 'oneTimeCode' : password ? 'password' : 'emailAddress'}
        returnKeyType="done" onSubmitEditing={onSubmitEditing} style={styles.input} />
    </View>
  );
}

export function AuthPanel({ onContinue }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [mode, setMode] = useState('sign-in');
  const [method, setMethod] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (Platform.OS === 'android') WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      mounted.current = false;
      if (Platform.OS === 'android') WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const run = async (label, work) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setMessage('');
    try { await work(); }
    catch (error) { if (mounted.current) setMessage(authError(error)); }
    finally {
      busyRef.current = false;
      if (mounted.current) setBusy('');
    }
  };

  const finalize = async (attempt) => {
    if (attempt.status !== 'complete') return false;
    await checked(attempt.finalize({ navigate: ({ session }) => {
      if (session?.currentTask && mounted.current) setMessage('Your account requires an additional verification step.');
    } }));
    setPassword('');
    return true;
  };

  const requestDeviceCode = async () => {
    if (!signIn.supportedSecondFactors?.some(factor => factor.strategy === 'email_code')) {
      throw new Error('This account requires a different verification method. Continue with Google.');
    }
    await checked(signIn.mfa.sendEmailCode());
    setVerification('device');
    setResendAt(Date.now() + 30000);
  };

  const google = () => run('google', async () => {
    const result = await startSSOFlow({ strategy: 'oauth_google', redirectUrl: SSO_REDIRECT_URL });
    if (result.createdSessionId && result.setActive) {
      await result.setActive({ session: result.createdSessionId });
      setPassword('');
      return;
    }
    if (['cancel', 'dismiss'].includes(result.authSessionResult?.type)) return;
    if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      await requestDeviceCode();
      return;
    }
    throw new Error('Google did not finish sign-in. Try again, or use an email code.');
  });

  const submit = () => run('email', async () => {
    if (!email.trim()) throw new Error('Enter your email address.');
    if (mode === 'sign-up') {
      await checked(signUp.password({ emailAddress: email.trim(), password }));
      if (await finalize(signUp)) return;
      await checked(signUp.verifications.sendEmailCode());
      setVerification('sign-up');
      setResendAt(Date.now() + 30000);
      return;
    }
    if (method === 'code') {
      await checked(signIn.create({ identifier: email.trim() }));
      if (!signIn.supportedFirstFactors?.some(factor => factor.strategy === 'email_code')) {
        throw new Error('Email-code sign-in is not enabled for this account. Continue with Google.');
      }
      await checked(signIn.emailCode.sendCode({ emailAddress: email.trim() }));
      setVerification('email');
      setResendAt(Date.now() + 30000);
      return;
    }
    await checked(signIn.password({ emailAddress: email.trim(), password }));
    if (await finalize(signIn)) return;
    if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      await requestDeviceCode();
      return;
    }
    throw new Error('Sign-in is not complete. Try Google or an email code.');
  });

  const verify = () => run('verify', async () => {
    const attempt = verification === 'sign-up' ? signUp : signIn;
    if (verification === 'sign-up') await checked(signUp.verifications.verifyEmailCode({ code: code.trim() }));
    else if (verification === 'device') await checked(signIn.mfa.verifyEmailCode({ code: code.trim() }));
    else await checked(signIn.emailCode.verifyCode({ code: code.trim() }));
    if (!(await finalize(attempt))) throw new Error('Another verification step is required for this account.');
  });

  const resend = () => run('resend', async () => {
    if (Date.now() < resendAt) throw new Error('Please wait 30 seconds before requesting another code.');
    if (verification === 'sign-up') await checked(signUp.verifications.sendEmailCode());
    else if (verification === 'device') await checked(signIn.mfa.sendEmailCode());
    else await checked(signIn.emailCode.sendCode({ emailAddress: email.trim() }));
    setResendAt(Date.now() + 30000);
    setMessage('A new code has been requested. Check your email.');
  });

  const reset = () => run('reset', async () => {
    await checked(signIn.reset());
    await checked(signUp.reset());
    setVerification(''); setCode(''); setPassword(''); setMode('sign-in');
  });

  if (!isLoaded) return <View style={styles.panel}><ActivityIndicator color="#F2EFE9" /><Text style={styles.copy}>Loading your account...</Text></View>;
  if (isSignedIn) return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>PARALLEL VISION ID</Text>
      <Text style={styles.title}>{user?.firstName || 'Your account'}</Text>
      <Text style={styles.copy}>{user?.primaryEmailAddress?.emailAddress || 'Signed in'}</Text>
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      {onContinue && <Action onPress={onContinue}>TALK TO NINA</Action>}
      <Action secondary busy={busy === 'signout'} onPress={() => run('signout', () => signOut())}>SIGN OUT</Action>
      <Text style={styles.revision}>{AUTH_REVISION}</Text>
    </View>
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>PARALLEL VISION ID</Text>
      <Text style={styles.title}>{verification ? 'Check your email' : mode === 'sign-up' ? 'Create account' : 'Sign in'}</Text>
      <Text style={styles.copy}>{verification ? `Enter the code sent to ${email.trim() || 'your account email'}.` : 'Your conversations, music and time with Nina.'}</Text>
      {verification ? <>
        <Field label="VERIFICATION CODE" value={code} onChangeText={setCode} code onSubmitEditing={verify} />
        <Action busy={busy === 'verify'} disabled={!!busy || !code.trim()} onPress={verify}>VERIFY & CONTINUE</Action>
        <Action secondary disabled={!!busy} onPress={resend}>SEND A NEW CODE</Action>
        <Action secondary disabled={!!busy} onPress={reset}>BACK TO SIGN IN</Action>
      </> : <>
        <Action busy={busy === 'google'} disabled={!!busy} onPress={google}>CONTINUE WITH GOOGLE</Action>
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR WITH EMAIL</Text><View style={styles.line} /></View>
        <Field label="EMAIL" value={email} onChangeText={setEmail} />
        {(mode === 'sign-up' || method === 'password') && <Field label="PASSWORD" value={password} onChangeText={setPassword} password onSubmitEditing={submit} />}
        <Action secondary busy={busy === 'email'} disabled={!!busy || !email.trim() || ((mode === 'sign-up' || method === 'password') && !password)} onPress={submit}>
          {mode === 'sign-up' ? 'CREATE ACCOUNT' : method === 'code' ? 'SEND EMAIL CODE' : 'SIGN IN WITH EMAIL'}
        </Action>
        <View style={styles.links}>
          {mode === 'sign-in' && <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => { setMethod(method === 'code' ? 'password' : 'code'); setMessage(''); }} style={styles.link}>
            <Text style={styles.linkText}>{method === 'code' ? 'Use password' : 'Use email code'}</Text>
          </Pressable>}
          <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => { setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'); setMessage(''); }} style={styles.link}>
            <Text style={styles.linkText}>{mode === 'sign-up' ? 'Back to sign in' : 'Create account'}</Text>
          </Pressable>
        </View>
      </>}
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      <Text style={styles.revision}>{AUTH_REVISION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingVertical: 12 },
  eyebrow: { color: theme.colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '500' },
  title: { color: theme.colors.text, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, fontWeight: '300', marginTop: 12 },
  copy: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 8 },
  field: { marginTop: 12 },
  label: { color: theme.colors.muted, fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  input: { height: 46, paddingHorizontal: 12, color: theme.colors.text, backgroundColor: '#0D0D0D', borderWidth: StyleSheet.hairlineWidth, borderColor: '#414141', borderRadius: 3, fontSize: 16 },
  action: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, marginTop: 14, borderRadius: 3, backgroundColor: '#F2EFE9', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#080808', fontSize: 11, letterSpacing: 1.4, fontWeight: '600', textAlign: 'center' },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#5A5A5A', backgroundColor: 'transparent' },
  secondaryText: { color: theme.colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 2 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#343434' },
  or: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.3 },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 4 },
  link: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 2, justifyContent: 'center' },
  linkText: { color: theme.colors.signal, fontSize: 12 },
  revision: { color: '#77736D', fontSize: 9, letterSpacing: 1.5, marginTop: 8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  error: { color: '#E0B9AE', fontSize: 13, lineHeight: 19, marginTop: 8 },
});
