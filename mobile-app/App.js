import React, { useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { theme } from './src/theme';
import { config } from './src/config';
import { AuthPanel } from './src/AuthPanel';

const tabs = ['HOME', 'NINA', '2063', 'MUSIC', 'PROFILE'];

function Hairline() {
  return <View style={styles.hairline} />;
}

function Kicker({ children }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

function ArrowButton({ label, onPress, strong = false }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, strong && styles.buttonStrong, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, strong && styles.buttonTextStrong]}>{label}</Text>
      <Text style={[styles.buttonArrow, strong && styles.buttonTextStrong]}>↗</Text>
    </Pressable>
  );
}

function SignalPanel({ onTalk }) {
  return (
    <View style={styles.signalPanel}>
      <View style={styles.signalTopline}>
        <Kicker>LIVE SIGNAL</Kicker>
        <View style={styles.signalStatusWrap}>
          <View style={styles.signalDot} />
          <Text style={styles.signalStatus}>ACTIVE</Text>
        </View>
      </View>
      <View style={styles.figure}>
        <View style={styles.figureGlow} />
        <Text style={styles.figureMark}>N</Text>
      </View>
      <Text style={styles.signalName}>NINA FOK</Text>
      <Text style={styles.signalMeta}>BERLIN / 2063</Text>
      <ArrowButton label="TALK TO NINA" strong onPress={onTalk} />
    </View>
  );
}

function HomeScreen({ setTab }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Kicker>PARALLEL VISION / BERLIN</Kicker>
        <Text style={styles.heroTitle}>BERLIN{`\n`}2063</Text>
        <Text style={styles.heroCopy}>Music, moving image and transmissions from an imagined future.</Text>
      </View>
      <SignalPanel onTalk={() => setTab('NINA')} />
      <View style={styles.section}>
        <Kicker>NOW TRANSMITTING</Kicker>
        <Hairline />
        <Text style={styles.releaseTitle}>STAY LOW</Text>
        <Text style={styles.releaseMeta}>MOLINARI × NINA FOK</Text>
        <Text style={styles.releaseCopy}>A current signal from Parallel Vision.</Text>
        <ArrowButton label="ENTER MUSIC" onPress={() => setTab('MUSIC')} />
      </View>
      <View style={styles.section}>
        <Kicker>THE WORLD</Kicker>
        <Hairline />
        <Text style={styles.editorialTitle}>A possible Berlin. Thirty-seven years from now.</Text>
        <Text style={styles.body}>Fragments, films, people and objects from the Parallel Vision world.</Text>
        <ArrowButton label="DISCOVER 2063" onPress={() => setTab('2063')} />
      </View>
    </ScrollView>
  );
}

function NinaScreen() {
  const { isSignedIn, getToken } = useAuth();
  const [live, setLive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nativeToken, setNativeToken] = useState('');

  const openLive = async () => {
    const token = isSignedIn ? await getToken() : '';
    setNativeToken(token || '');
    setLive(true);
  };

  if (live) {
    return (
      <Modal visible animationType="fade" presentationStyle="fullScreen">
        <View style={styles.liveShell}>
          <View style={styles.liveHeader}>
            <View>
              <Text style={styles.liveHeaderKicker}>NINA FOK / LIVE SIGNAL</Text>
              <Text style={styles.liveHeaderStatus}>{loaded ? 'CONNECTED VIEW' : 'OPENING SIGNAL'}</Text>
            </View>
            <Pressable onPress={() => setLive(false)} style={styles.closeSignalButton}>
              <Text style={styles.closeSignalText}>CLOSE</Text>
            </Pressable>
          </View>

          <WebView
            source={{ uri: config.ninaLiveUrl }}
            injectedJavaScriptBeforeContentLoaded={nativeToken ? `
              document.cookie = "__session=${nativeToken}; Path=/; Domain=.parallelvisionlabel.com; Secure; SameSite=Lax";
              window.__PV_NATIVE_APP__ = true;
              true;
            ` : undefined}
            injectedJavaScript={`
              (function () {
                var bind = function () {
                  var button = document.getElementById('ninaFullscreen');
                  if (!button || button.dataset.pvNativeFullscreen) return;
                  button.dataset.pvNativeFullscreen = '1';
                  button.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    window.ReactNativeWebView.postMessage('PV_FULLSCREEN');
                  }, true);
                };
                bind();
                setTimeout(bind, 500);
                setTimeout(bind, 1500);
              })();
              true;
            `}
            onMessage={(event) => {
              if (event.nativeEvent.data === 'PV_FULLSCREEN') {
                setLoaded((value) => value);
              }
            }}
            style={styles.webview}
            containerStyle={styles.webviewContainer}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoaded(true)}
            onShouldStartLoadWithRequest={() => true}
          />
        </View>
      </Modal>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Kicker>NINA FOK / LIVE SIGNAL</Kicker>
      <Text style={styles.pageTitle}>SHE’S IN{`\n`}BERLIN, 2063.</Text>
      <Text style={styles.pageIntro}>A consciousness inside the Parallel Vision world. Speak with her live.</Text>
      <SignalPanel onTalk={openLive} />
      <View style={styles.section}>
        <Kicker>CONTINUITY</Kicker>
        <Hairline />
        <Text style={styles.editorialTitle}>The existing Nina system stays intact.</Text>
        <Text style={styles.body}>The production Nina experience remains embedded inside the app while the native account layer is now handled by Clerk.</Text>
      </View>
    </ScrollView>
  );
}

function WorldScreen() {
  const entries = [
    ['01', 'THE CITY', 'Berlin as remembered, rebuilt and imagined.'],
    ['02', 'FASHION AFTER FABRIC', 'Bodies, material and identity beyond conventional clothing.'],
    ['03', 'TRANSMISSIONS', 'Short films, voices and fragments from the world.'],
    ['04', 'PEOPLE', 'Artists and figures moving through Parallel Vision.'],
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Kicker>PARALLEL VISION / WORLD INDEX</Kicker>
      <Text style={styles.pageTitle}>BERLIN{`\n`}2063</Text>
      <Text style={styles.pageIntro}>Not a timeline. An archive of signals from a possible future.</Text>
      <View style={styles.worldGrid}>
        {entries.map(([number, title, copy]) => (
          <View key={number} style={styles.worldCard}>
            <Text style={styles.worldNumber}>{number}</Text>
            <Text style={styles.worldTitle}>{title}</Text>
            <Text style={styles.worldCopy}>{copy}</Text>
          </View>
        ))}
      </View>
      <ArrowButton label="OPEN CURRENT WEB ARCHIVE" onPress={() => Linking.openURL(config.siteUrl)} />
    </ScrollView>
  );
}

function MusicScreen() {
  const releases = [
    ['STAY LOW', 'Molinari × Nina FOK', '2026'],
    ['TANZEN IM KREIS', 'Alejandro Molinari', '2026'],
    ['DARK ROCK EP', 'Blex', '2026'],
    ['BUILT TO LAST EP', 'REFRAKT', '2026'],
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Kicker>PARALLEL VISION / MUSIC</Kicker>
      <Text style={styles.pageTitle}>CURRENT{`\n`}SIGNALS</Text>
      <View style={styles.releaseList}>
        {releases.map(([title, artist, year], index) => (
          <View key={title} style={styles.releaseRow}>
            <Text style={styles.releaseIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.releaseRowCopy}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowMeta}>{artist.toUpperCase()} / {year}</Text>
            </View>
            <Text style={styles.rowArrow}>↗</Text>
          </View>
        ))}
      </View>
      <ArrowButton label="OPEN LABEL CATALOGUE" onPress={() => Linking.openURL(config.siteUrl)} />
    </ScrollView>
  );
}

function ProfileScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Kicker>ACCOUNT / SIGNAL IDENTITY</Kicker>
      <Text style={styles.pageTitle}>YOUR{`\n`}PROFILE</Text>
      <Text style={styles.pageIntro}>One identity for Parallel Vision, Nina continuity and Signal Credits.</Text>
      <AuthPanel />
      <View style={styles.section}>
        <Kicker>NEXT CONNECTION</Kicker>
        <Hairline />
        <Text style={styles.editorialTitle}>Signal Credits become native next.</Text>
        <Text style={styles.body}>Once the Clerk native application is enabled in the production dashboard, this account session can authenticate directly against the existing Nina Worker.</Text>
      </View>
    </ScrollView>
  );
}

function ParallelVisionApp() {
  const [tab, setTab] = useState('HOME');
  const screen = useMemo(() => {
    if (tab === 'NINA') return <NinaScreen />;
    if (tab === '2063') return <WorldScreen />;
    if (tab === 'MUSIC') return <MusicScreen />;
    if (tab === 'PROFILE') return <ProfileScreen />;
    return <HomeScreen setTab={setTab} />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
      <View style={styles.topbar}>
        <Text style={styles.wordmark}>PARALLEL VISION</Text>
        <Text style={styles.topbarMeta}>PV / 2063</Text>
      </View>
      <View style={styles.content}>{screen}</View>
      <View style={styles.nav}>
        {tabs.map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={styles.navItem}>
            <Text style={[styles.navText, item === tab && styles.navTextActive]}>{item}</Text>
            {item === tab ? <View style={styles.navActive} /> : null}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
      <ParallelVisionApp />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1 },
  topbar: { height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.line },
  wordmark: { color: theme.colors.text, fontSize: 12, letterSpacing: 2.6, fontWeight: '600' },
  topbarMeta: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.8 },
  scroll: { paddingHorizontal: 18, paddingTop: 26, paddingBottom: 64 },
  hero: { paddingTop: 18, paddingBottom: 34 },
  kicker: { color: theme.colors.muted, fontSize: 9, letterSpacing: 2.1, fontWeight: '600' },
  heroTitle: { color: theme.colors.text, fontSize: 62, lineHeight: 58, letterSpacing: -2.4, fontWeight: '300', marginTop: 18 },
  heroCopy: { color: theme.colors.signal, fontSize: 17, lineHeight: 25, maxWidth: 300, marginTop: 22 },
  pageTitle: { color: theme.colors.text, fontSize: 48, lineHeight: 47, letterSpacing: -1.8, fontWeight: '300', marginTop: 18 },
  pageIntro: { color: theme.colors.signal, fontSize: 16, lineHeight: 24, maxWidth: 330, marginTop: 18, marginBottom: 30 },
  signalPanel: { backgroundColor: theme.colors.panel, borderRadius: theme.radius.lg, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line },
  signalTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signalStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  signalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.text },
  signalStatus: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.6 },
  figure: { height: 250, marginTop: 18, marginBottom: 18, borderRadius: 20, backgroundColor: '#090909', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  figureGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: '#272727' },
  figureMark: { color: '#1C1C1C', fontSize: 164, fontWeight: '200', lineHeight: 190 },
  signalName: { color: theme.colors.text, fontSize: 28, letterSpacing: -0.8, fontWeight: '300' },
  signalMeta: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.8, marginTop: 6, marginBottom: 18 },
  section: { marginTop: 42 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 16 },
  releaseTitle: { color: theme.colors.text, fontSize: 36, letterSpacing: -1.2, fontWeight: '300' },
  releaseMeta: { color: theme.colors.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 7 },
  releaseCopy: { color: theme.colors.signal, fontSize: 15, lineHeight: 22, marginTop: 18 },
  editorialTitle: { color: theme.colors.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, fontWeight: '300' },
  body: { color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14 },
  button: { minHeight: 52, marginTop: 20, paddingHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonStrong: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  buttonText: { color: theme.colors.text, fontSize: 10, letterSpacing: 1.8, fontWeight: '600' },
  buttonTextStrong: { color: '#090909' },
  buttonArrow: { color: theme.colors.text, fontSize: 17 },
  pressed: { opacity: 0.66 },
  worldGrid: { marginTop: 28, gap: 12 },
  worldCard: { minHeight: 170, padding: 18, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line, backgroundColor: theme.colors.panel },
  worldNumber: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.5 },
  worldTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '300', marginTop: 36 },
  worldCopy: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 9, maxWidth: 280 },
  releaseList: { marginTop: 28 },
  releaseRow: { minHeight: 92, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line, flexDirection: 'row', alignItems: 'center' },
  releaseIndex: { width: 34, color: theme.colors.muted, fontSize: 9 },
  releaseRowCopy: { flex: 1 },
  rowTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '300' },
  rowMeta: { color: theme.colors.muted, fontSize: 8, letterSpacing: 1.1, marginTop: 5 },
  rowArrow: { color: theme.colors.muted, fontSize: 16 },
  nav: { height: 62, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line, flexDirection: 'row', backgroundColor: '#080808', paddingHorizontal: 5 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#55534F', fontSize: 8, letterSpacing: 0.7, fontWeight: '600' },
  navTextActive: { color: theme.colors.text },
  navActive: { width: 18, height: 1, backgroundColor: theme.colors.text, marginTop: 7 },
  liveShell: { flex: 1, backgroundColor: '#000' },
  liveHeader: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#242424', backgroundColor: '#080808' },
  liveHeaderKicker: { color: theme.colors.text, fontSize: 9, letterSpacing: 1.8, fontWeight: '600' },
  liveHeaderStatus: { color: theme.colors.muted, fontSize: 7, letterSpacing: 1.4, marginTop: 4 },
  closeSignalButton: { minWidth: 64, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#343434', borderRadius: 10 },
  closeSignalText: { color: theme.colors.text, fontSize: 8, letterSpacing: 1.3, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#000' },
  webviewContainer: { flex: 1, backgroundColor: '#000' },
});





