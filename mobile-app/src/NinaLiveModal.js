import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
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
      <StatusBar animated hidden={false} barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <View style={styles.heading}><Text style={styles.label}>NINA FOK / LIVE SIGNAL</Text><Text style={styles.status}>{status}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Nina" disabled={stopping} onPress={() => stop('close')} style={styles.close}>
            <Text style={styles.closeText}>{stopping ? 'CLOSING' : 'CLOSE'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <View style={styles.deck}>
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
          {loading && !error ? <>
            <View style={styles.signalRow}><View style={styles.signalDot}/><Text style={styles.signalLabel}>PRIVATE CHANNEL / BERLIN 2063</Text></View>
            <Text style={styles.loadingName}>NINA{`\n`}FOK</Text>
            <View style={styles.loadingLine}/>
            <Text style={styles.loadingStatus}>{status}</Text>
            <Text style={styles.copy}>Preparing the live signal.</Text>
          </> : <>
            <Text style={styles.errorCode}>SIGNAL INTERRUPTED</Text>
            <Text style={styles.title}>The signal could not open.</Text><Text style={styles.copy}>{error}</Text>
            <Pressable disabled={stopping} accessibilityRole="button" onPress={() => stop('retry')} style={styles.retry}><Text style={styles.closeText}>TRY AGAIN</Text></Pressable>
            <Pressable disabled={stopping} accessibilityRole="button" onPress={() => stop('profile')} style={styles.retrySecondary}><Text style={styles.secondaryText}>RETURN TO PROFILE</Text></Pressable>
          </>}
          <Text style={styles.revision}>BRIDGE 01 / NATIVE SIGNAL</Text>
        </View>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  deck:{flex:1,marginHorizontal:9,marginBottom:24,marginTop:4,borderWidth:StyleSheet.hairlineWidth,borderColor:'#414940',borderRadius:5,overflow:'hidden',backgroundColor:'#020303'},
  shell:{flex:1,backgroundColor:'#000'},stage:{flex:1,backgroundColor:'#000'},safeHeader:{backgroundColor:'#000'},
  header:{minHeight:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#242424'},heading:{flex:1,marginRight:12},label:{color:'#F2EFE9',fontSize:9,letterSpacing:1.7},status:{color:'#817D76',fontSize:8,letterSpacing:1.2,marginTop:5},
  close:{minHeight:42,minWidth:70,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'#494949'},closeText:{color:'#F2EFE9',fontSize:9,letterSpacing:1.35},
  immersiveControls:{...StyleSheet.absoluteFillObject,zIndex:30},immersiveRow:{flexDirection:'row',justifyContent:'flex-end',paddingHorizontal:14,paddingTop:8},floatingClose:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(0,0,0,.42)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.34)',alignItems:'center',justifyContent:'center'},floatingCloseText:{color:'#F2EFE9',fontSize:27,lineHeight:29,fontWeight:'200'},pressed:{opacity:.62},
  overlay:{...StyleSheet.absoluteFillObject,paddingHorizontal:28,paddingTop:42,paddingBottom:30,justifyContent:'center',backgroundColor:'#070707'},
  signalRow:{flexDirection:'row',alignItems:'center',marginBottom:24},signalDot:{width:5,height:5,borderRadius:3,backgroundColor:'#F2EFE9',marginRight:8},signalLabel:{color:'#8C877F',fontSize:8,letterSpacing:1.55},
  loadingName:{color:'#F2EFE9',fontSize:58,lineHeight:53,letterSpacing:-2.6,fontWeight:'200'},loadingLine:{height:StyleSheet.hairlineWidth,backgroundColor:'#33312E',marginTop:28,marginBottom:15},loadingStatus:{color:'#C6C1B8',fontSize:10,letterSpacing:1.6},
  errorCode:{color:'#8C877F',fontSize:8,letterSpacing:1.55,marginBottom:18},title:{color:'#F2EFE9',fontSize:29,lineHeight:34,fontWeight:'250',letterSpacing:-.6},copy:{color:'#9D9890',fontSize:13.5,lineHeight:21,marginTop:14,maxWidth:320},
  retry:{minHeight:50,marginTop:22,borderWidth:StyleSheet.hairlineWidth,borderColor:'#5A5752',justifyContent:'center',alignItems:'center'},retrySecondary:{minHeight:46,marginTop:8,justifyContent:'center',alignItems:'center'},secondaryText:{color:'#817D76',fontSize:9,letterSpacing:1.25},revision:{color:'#55514C',fontSize:7.5,letterSpacing:1.35,marginTop:24},
});
