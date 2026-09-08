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
const ninaHeroVideo = `${config.siteUrl}/assets/optimized/video/nina-fok/ninaloophero-mobile.mp4`;
const ninaHeroPoster = `${config.siteUrl}/assets/optimized/nina-fok/HDNINACANON.webp`;

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

function NinaMotionHero({ onTalk }) {
  const heroHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#050505}video{width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block;filter:brightness(.72) saturate(.82)}</style></head><body><video autoplay muted loop playsinline webkit-playsinline poster="${ninaHeroPoster}"><source src="${ninaHeroVideo}" type="video/mp4"></video></body></html>`;

  return (
    <View style={styles.heroSignal}>
      <WebView
        source={{ html: heroHtml, baseUrl: config.siteUrl }}
        style={styles.heroVideo}
        containerStyle={styles.heroVideoContainer}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        pointerEvents="none"
      />
      <View style={styles.heroShade} pointerEvents="none" />
      <View style={styles.heroSignalTop}>
        <Kicker>LIVE SIGNAL</Kicker>
        <View style={styles.signalStatusWrap}>
          <View style={styles.signalDot} />
          <Text style={styles.signalStatus}>ACTIVE</Text>
        </View>
      </View>
      <View style={styles.heroSignalBottom}>
        <Text style={styles.heroSignalName}>NINA FOK</Text>
        <Text style={styles.heroSignalMeta}>BERLIN / 2063</Text>
        <Pressable onPress={onTalk} style={({ pressed }) => [styles.heroTalkButton, pressed && styles.pressed]}>
          <Text style={styles.heroTalkText}>TALK TO NINA</Text>
          <Text style={styles.heroTalkArrow}>↗</Text>
        </Pressable>
      </View>
    </View>
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

function HomeScreen({ setTab, onTalk }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.homeIntro}>
        <Kicker>PARALLEL VISION / BERLIN</Kicker>
        <Text style={styles.homeStatement}>Music, moving image and transmissions from an imagined future.</Text>
      </View>
      <NinaMotionHero onTalk={onTalk} />
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

function NinaScreen({ onTalk }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Kicker>NINA FOK / LIVE SIGNAL</Kicker>
      <Text style={styles.pageTitle}>SHE’S IN{`\n`}BERLIN, 2063.</Text>
      <Text style={styles.pageIntro}>A consciousness inside the Parallel Vision world. Speak with her live.</Text>
      <SignalPanel onTalk={onTalk} />
      <View style={styles.section}>
        <Kicker>CONTINUITY</Kicker>
        <Hairline />
        <Text style={styles.editorialTitle}>Your conversations continue here.</Text>
        <Text style={styles.body}>Your Parallel Vision account carries Nina continuity and live access across sessions.</Text>
      </View>
    </ScrollView>
  );
}

function NinaLiveModal({ visible, loaded, nativeToken, onLoaded, onClose }) {
  const nativeSessionScript = `
    window.__PV_NATIVE_APP__ = true;
    ${nativeToken ? `document.cookie = "__session=${nativeToken}; Path=/; Domain=.parallelvisionlabel.com; Secure; SameSite=Lax";` : ''}
    true;
  `;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.liveShell}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.liveNativeHeader}>
          <View>
            <Text style={styles.liveHeaderKicker}>NINA FOK / LIVE SIGNAL</Text>
            <Text style={styles.liveHeaderStatus}>{loaded ? 'SIGNAL READY' : 'OPENING SIGNAL'}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.liveCloseButton} accessibilityRole="button" accessibilityLabel="Close Nina">
            <Text style={styles.liveCloseText}>CLOSE</Text>
          </Pressable>
        </View>
        <View style={styles.liveWebviewFrame}>
          <WebView
            source={{ uri: `${config.siteUrl}/nina-app.html?pv_app=1&v=20260908-2` }}
            injectedJavaScriptBeforeContentLoaded={nativeSessionScript}
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
            cacheEnabled={false}
            onLoadEnd={onLoaded}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url || '';
              if (url.startsWith(config.siteUrl) || url.startsWith('about:blank')) return true;
              return false;
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
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
    </ScrollView>
  );
}

function ParallelVisionApp() {
  const { isSignedIn, getToken } = useAuth();
  const [tab, setTab] = useState('HOME');
  const [live, setLive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nativeToken, setNativeToken] = useState('');

  const openLive = async () => {
    const token = isSignedIn ? await getToken() : '';
    setNativeToken(token || '');
    setLoaded(false);
    setLive(true);
  };

  const screen = useMemo(() => {
    if (tab === 'NINA') return <NinaScreen onTalk={openLive} />;
    if (tab === '2063') return <WorldScreen />;
    if (tab === 'MUSIC') return <MusicScreen />;
    if (tab === 'PROFILE') return <ProfileScreen />;
    return <HomeScreen setTab={setTab} onTalk={openLive} />;
  }, [tab, isSignedIn]);

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
      <NinaLiveModal
        visible={live}
        loaded={loaded}
        nativeToken={nativeToken}
        onLoaded={() => setLoaded(true)}
        onClose={() => setLive(false)}
      />
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
  homeIntro: { paddingTop: 8, paddingBottom: 22 },
  homeStatement: { color: theme.colors.text, fontSize: 25, lineHeight: 31, letterSpacing: -0.6, fontWeight: '300', maxWidth: 330, marginTop: 15 },
  hero: { paddingTop: 18, paddingBottom: 34 },
  kicker: { color: theme.colors.muted, fontSize: 9, letterSpacing: 2.1, fontWeight: '600' },
  heroTitle: { color: theme.colors.text, fontSize: 62, lineHeight: 58, letterSpacing: -2.4, fontWeight: '300', marginTop: 18 },
  heroCopy: { color: theme.colors.signal, fontSize: 17, lineHeight: 25, maxWidth: 300, marginTop: 22 },
  heroSignal: { height: 470, borderRadius: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#282828', backgroundColor: '#050505' },
  heroVideo: { flex: 1, backgroundColor: '#050505' },
  heroVideoContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  heroSignalTop: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroSignalBottom: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  heroSignalName: { color: '#F2EFE9', fontSize: 31, letterSpacing: -0.9, fontWeight: '300' },
  heroSignalMeta: { color: '#B2ADA5', fontSize: 9, letterSpacing: 1.8, marginTop: 5 },
  heroTalkButton: { minHeight: 54, marginTop: 16, paddingHorizontal: 17, borderRadius: 17, backgroundColor: '#F2EFE9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTalkText: { color: '#090909', fontSize: 10, letterSpacing: 1.9, fontWeight: '700' },
  heroTalkArrow: { color: '#090909', fontSize: 18 },
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
  rowMeta: { color: theme.colors.muted, fontSize: 9, letterSpacing: 1.1, marginTop: 5 },
  rowArrow: { color: theme.colors.muted, fontSize: 16 },
  liveShell: { flex: 1, backgroundColor: '#000000' },
  liveNativeHeader: { minHeight: 64, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#262626', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#050505' },
  liveHeaderKicker: { color: '#F2EFE9', fontSize: 10, letterSpacing: 2.1, fontWeight: '600' },
  liveHeaderStatus: { color: '#76736E', fontSize: 8, letterSpacing: 1.6, marginTop: 5 },
  liveCloseButton: { minWidth: 72, height: 38, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center' },
  liveCloseText: { color: '#F2EFE9', fontSize: 9, letterSpacing: 1.5, fontWeight: '600' },
  liveWebviewFrame: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#000000' },
  webviewContainer: { backgroundColor: '#000000' },
  nav: { minHeight: 64, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line, backgroundColor: '#050505', flexDirection: 'row', alignItems: 'stretch' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#55524C', fontSize: 8, letterSpacing: 1.3, fontWeight: '600' },
  navTextActive: { color: theme.colors.text },
  navActive: { width: 18, height: 1, backgroundColor: theme.colors.text, marginTop: 8 },
});