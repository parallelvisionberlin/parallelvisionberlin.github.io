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
    setLoaded(false);
    setLive(true);
  };

  const appModeScript = `
    (function () {
      window.__PV_NATIVE_APP__ = true;
      ${nativeToken ? `document.cookie = "__session=${nativeToken}; Path=/; Domain=.parallelvisionlabel.com; Secure; SameSite=Lax";` : ''}

      function installNativeStyle() {
        var id = 'pv-native-nina-style';
        var style = document.getElementById(id);
        if (!style) {
          style = document.createElement('style');
          style.id = id;
          document.head.appendChild(style);
        }
        style.textContent = [
          'html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;background:#000!important;overflow:hidden!important}',
          'body>*:not(#ninaOverlay):not(script):not(style){display:none!important}',
          '#ninaOverlay{display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;margin:0!important;z-index:2147483647!important;background:#000!important}',
          '.nina-window{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
          '#ninaFullscreen,#closeNina,.nina-fullscreen,.nina-close{display:none!important}'
        ].join('');
      }

      function openNinaOnly() {
        installNativeStyle();
        var overlay = document.getElementById('ninaOverlay');
        if (!overlay) return false;
        var open = overlay.classList.contains('is-open') || overlay.getAttribute('aria-hidden') === 'false';
        if (!open) {
          var trigger = document.getElementById('openNina') || document.querySelector('[data-nina-open]');
          if (trigger) trigger.click();
        }
        return true;
      }

      installNativeStyle();
      var observer = new MutationObserver(function () {
        installNativeStyle();
        openNinaOnly();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', openNinaOnly);
      setTimeout(openNinaOnly, 100);
      setTimeout(openNinaOnly, 350);
      setTimeout(openNinaOnly, 900);
      setTimeout(openNinaOnly, 1800);
    })();
    true;
  `;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Kicker>NINA FOK / LIVE SIGNAL</Kicker>
        <Text style={styles.pageTitle}>SHE’S IN{`\n`}BERLIN, 2063.</Text>
        <Text style={styles.pageIntro}>A consciousness inside the Parallel Vision world. Speak with her live.</Text>
        <SignalPanel onTalk={openLive} />
        <View style={styles.section}>
          <Kicker>CONTINUITY</Kicker>
          <Hairline />
          <Text style={styles.editorialTitle}>Your conversations continue here.</Text>
          <Text style={styles.body}>Your Parallel Vision account carries Nina continuity and live access across sessions.</Text>
        </View>
      </ScrollView>

      <Modal visible={live} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setLive(false)}>
        <SafeAreaView style={styles.liveShell}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.liveNativeHeader}>
            <View>
              <Text style={styles.liveHeaderKicker}>NINA FOK / LIVE SIGNAL</Text>
              <Text style={styles.liveHeaderStatus}>{loaded ? 'SIGNAL READY' : 'OPENING SIGNAL'}</Text>
            </View>
            <Pressable onPress={() => setLive(false)} style={styles.liveCloseButton} accessibilityRole="button" accessibilityLabel="Close Nina">
              <Text style={styles.liveCloseText}>CLOSE</Text>
            </Pressable>
          </View>
          <View style={styles.liveWebviewFrame}>
            <WebView
              source={{ uri: `${config.siteUrl}/index.html?nina=1&pv_app=1` }}
              injectedJavaScriptBeforeContentLoaded={appModeScript}
              injectedJavaScript={appModeScript}
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
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url || '';
                if (url.startsWith(config.siteUrl) || url.startsWith('about:blank')) return true;
                return false;
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
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
