import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { isImmersiveNinaState, isNinaURL, NINA_ORIGIN, NINA_URL, readBridgeMessage, tokenReplyScript, withTimeout } from './ninaBridge';

export function NinaLiveModal({ getToken, onClose, onSignIn }) {
  const web = useRef(null);
  const alive = useRef(true);
  const tokenGetter = useRef(getToken);
  tokenGetter.current = getToken;
  const page = useRef('');
  const generation = useRef(0);
  const operation = useRef('');
  const stopTimer = useRef(null);
  const ready = useRef(false);
  const requests = useRef(new Set());
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('OPENING SIGNAL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const finish = useCallback(() => {
    const action = operation.current;
    if (!action) return;
    operation.current = '';
    clearTimeout(stopTimer.current);
    generation.current += 1;
    setImmersive(false);
    if (action === 'retry') {
      page.current = ''; ready.current = false;
      setError(''); setStatus('OPENING SIGNAL'); setLoading(true); setStopping(false);
      setAttempt(value => value + 1);
    } else if (action === 'profile') onSignIn();
    else onClose();
  }, [onClose, onSignIn]);

  const stop = useCallback((action = 'close') => {
    if (operation.current) return;
    operation.current = action;
    setStopping(true); setStatus('CLOSING SIGNAL');
    web.current?.injectJavaScript(`if(location.origin===${JSON.stringify(NINA_ORIGIN)}&&location.pathname==='/nina-app.html'){window.__PV_NINA_CLOSE__?.();}true;`);
    stopTimer.current = setTimeout(finish, 6000);
  }, [finish]);

  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', next => { if (next === 'background') stop('close'); });
    return () => { alive.current = false; generation.current += 1; clearTimeout(stopTimer.current); subscription.remove(); };
  }, [stop]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready.current && alive.current) { setLoading(false); setImmersive(false); setStatus('SIGNAL UNAVAILABLE'); setError('Nina did not finish opening. Check the connection and try again.'); }
    }, 30000);
    return () => clearTimeout(timer);
  }, [attempt]);

  const fail = text => {
    if (operation.current) return;
    ready.current = true; setLoading(false); setImmersive(false); setStatus('SIGNAL UNAVAILABLE'); setError(text);
  };

  const receive = async event => {
    const data = readBridgeMessage(event.nativeEvent);
    if (!data || !alive.current) return;
    if (page.current && page.current !== data.pageId) return;
    page.current = data.pageId;
    if (data.type === 'PV_NINA_TOKEN_REQUEST') {
      const requestKey = `${data.pageId}:${data.id}`;
      if (requests.current.has(requestKey)) return;
      requests.current.add(requestKey);
      const epoch = generation.current;
      let token = '', problem = '';
      try {
        token = await withTimeout(tokenGetter.current({ skipCache: data.force === true }));
        if (!token) problem = 'signed_out';
      } catch { problem = 'refresh_failed'; }
      if (alive.current && epoch === generation.current && data.pageId === page.current) {
        web.current?.injectJavaScript(tokenReplyScript({ id: data.id, pageId: data.pageId, token: token || '', error: problem }));
      }
      requests.current.delete(requestKey);
      return;
    }
    if (data.type === 'PV_NINA_CLOSED') { finish(); return; }
    if (operation.current) return;
    if (data.type === 'PV_NINA_STATE') {
      const detail = String(data.detail || '').slice(0, 80);
      setStatus(detail || 'OPENING SIGNAL');
      setImmersive(isImmersiveNinaState(detail));
      if (detail !== 'VERIFYING APP SESSION') { ready.current = true; setLoading(false); setError(''); }
    } else if (data.type === 'PV_NINA_ERROR') fail(String(data.detail || 'Nina could not open.').slice(0, 280));
    else if (data.type === 'PV_NINA_SHOW_PROFILE') stop('profile');
    else if (data.type === 'PV_NINA_RETRY') stop('retry');
  };

  return <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => stop('close')}>
    <View style={styles.shell}>
      <StatusBar animated hidden={immersive} barStyle="light-content" backgroundColor="#000" />
      {!immersive && <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <View style={styles.heading}><Text style={styles.label}>NINA FOK / LIVE SIGNAL</Text><Text style={styles.status}>{status}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Nina" disabled={stopping} onPress={() => stop('close')} style={styles.close}>
            <Text style={styles.closeText}>{stopping ? 'CLOSING' : 'CLOSE'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>}
      <View style={styles.stage}>
        <WebView key={attempt} ref={web} source={{ uri: NINA_URL }} style={styles.stage}
          javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt" setSupportMultipleWindows={false}
          cacheEnabled={false} bounces={false} scrollEnabled={false}
          contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
          onMessage={receive}
          onError={() => fail('The live page could not load. Check your connection.')}
          onHttpError={event => { if(isNinaURL(event.nativeEvent.url)) fail(`The live page returned HTTP ${event.nativeEvent.statusCode}.`); }}
          onContentProcessDidTerminate={() => fail('The live view stopped. Tap retry to reconnect.')}
          onShouldStartLoadWithRequest={request => {
            if (isNinaURL(request.url) || request.url === 'about:blank') return true;
            try {
              const target = new URL(request.url);
              if (request.isTopFrame !== false && target.protocol === 'https:' && target.hostname === 'checkout.stripe.com') {
                Linking.openURL(target.href).catch(() => fail('Checkout could not open.'));
              }
            } catch { /* Deny unknown destinations. */ }
            return false;
          }} />
        {(loading || !!error) && <View style={styles.overlay}>
          {loading && !error ? <><ActivityIndicator color="#F2EFE9" /><Text style={styles.copy}>Connecting your account to Nina…</Text></> : <>
            <Text style={styles.title}>The signal could not open.</Text><Text style={styles.copy}>{error}</Text>
            <Pressable disabled={stopping} accessibilityRole="button" onPress={() => stop('retry')} style={styles.retry}><Text style={styles.closeText}>TRY AGAIN</Text></Pressable>
            <Pressable disabled={stopping} accessibilityRole="button" onPress={() => stop('profile')} style={styles.retry}><Text style={styles.closeText}>RETURN TO PROFILE</Text></Pressable>
          </>}
          <Text style={styles.revision}>BRIDGE 01</Text>
        </View>}
      </View>
      {immersive && <SafeAreaView pointerEvents="box-none" style={styles.immersiveControls}>
        <View pointerEvents="box-none" style={styles.immersiveRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Nina" disabled={stopping} onPress={() => stop('close')} style={({ pressed }) => [styles.floatingClose, pressed && styles.pressed]}>
            <Text style={styles.floatingCloseText}>×</Text>
          </Pressable>
        </View>
      </SafeAreaView>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  shell:{flex:1,backgroundColor:'#000'},stage:{flex:1,backgroundColor:'#000'},safeHeader:{backgroundColor:'#000'},
  header:{minHeight:64,paddingHorizontal:18,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#262626'},heading:{flex:1,marginRight:12},label:{color:'#F2EFE9',fontSize:10,letterSpacing:1.8},status:{color:'#99948B',fontSize:9,letterSpacing:1.1,marginTop:6},
  close:{minHeight:44,minWidth:76,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'#555',borderRadius:3},closeText:{color:'#F2EFE9',fontSize:10,letterSpacing:1.3},
  immersiveControls:{...StyleSheet.absoluteFillObject,zIndex:30},immersiveRow:{flexDirection:'row',justifyContent:'flex-end',paddingHorizontal:14,paddingTop:8},floatingClose:{width:46,height:46,borderRadius:23,backgroundColor:'rgba(0,0,0,.48)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.38)',alignItems:'center',justifyContent:'center'},floatingCloseText:{color:'#F2EFE9',fontSize:28,lineHeight:30,fontWeight:'200'},pressed:{opacity:.65},
  overlay:{...StyleSheet.absoluteFillObject,padding:28,justifyContent:'center',backgroundColor:'#080808'},title:{color:'#F2EFE9',fontSize:25,lineHeight:32,fontWeight:'300'},copy:{color:'#C7C2B8',fontSize:14,lineHeight:22,marginTop:16},retry:{minHeight:48,marginTop:18,borderWidth:StyleSheet.hairlineWidth,borderColor:'#555',justifyContent:'center',alignItems:'center'},revision:{color:'#777',fontSize:9,letterSpacing:1.4,marginTop:22},
});
