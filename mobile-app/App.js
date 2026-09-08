import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform,
  Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ClerkProvider, useAuth, useSession } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { theme } from './src/theme';
import { config } from './src/config';
import { AuthPanel } from './src/AuthPanel';
import { NinaLiveModal } from './src/NinaLiveModal';
import { withTimeout } from './src/ninaBridge';

const tabs = ['HOME', 'NINA', '2063', 'MUSIC', 'PROFILE'];
const ninaHeroVideo = `${config.siteUrl}/assets/optimized/video/nina-fok/ninaloophero-mobile.mp4`;
const ninaHeroPoster = `${config.siteUrl}/assets/optimized/nina-fok/HDNINACANON.webp`;


function Hairline() { return <View style={styles.hairline} />; }
function Kicker({ children }) { return <Text style={styles.kicker}>{children}</Text>; }
function ArrowButton({ label, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <Text style={styles.buttonText}>{label}</Text><Text style={styles.arrow}>↗</Text>
  </Pressable>;
}

function NinaMotionHero({ onTalk, busy = false, compact = false, paused = false }) {
  const videoRef = useRef(null);
  const heroHtml = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#050505}video{width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block}</style></head><body><video id="hero" autoplay muted loop playsinline webkit-playsinline preload="auto" poster="${ninaHeroPoster}" src="${ninaHeroVideo}"></video><script>var v=document.getElementById('hero');v.muted=true;v.play().catch(function(){});document.addEventListener('visibilitychange',function(){if(document.hidden)v.pause();else v.play().catch(function(){});});</script></body></html>`, []);
  useEffect(() => {
    videoRef.current?.injectJavaScript(`var v=document.getElementById('hero');if(v){${paused ? 'v.pause();' : 'v.play().catch(function(){});'}}true;`);
  }, [paused]);
  return (
    <View style={[styles.heroSignal, compact && styles.heroCompact]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <WebView ref={videoRef} source={{ html: heroHtml, baseUrl: config.siteUrl }}
          style={styles.webview} scrollEnabled={false} bounces={false}
          allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false} onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === config.siteUrl || request.url === `${config.siteUrl}/`} />
      </View>
      <View pointerEvents="none" style={styles.heroShade} />
      <View pointerEvents="none" style={styles.heroTop}><Kicker>LIVE CONVERSATION</Kicker><Kicker>BERLIN / 2063</Kicker></View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroName}>NINA FOK</Text>
        <Text style={styles.heroMeta}>She's in Berlin, 2063.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Talk to Nina" disabled={busy} onPress={onTalk}
          style={({ pressed }) => [styles.heroButton, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#F2EFE9" /> : <><Text style={styles.heroButtonText}>TALK TO NINA</Text><Text style={styles.arrow}>↗</Text></>}
        </Pressable>
      </View>
    </View>
  );
}

function HomeScreen({ setTab, onTalk, busy, paused }) {
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.homeIntro}><Kicker>PARALLEL VISION / BERLIN</Kicker>
      <Text style={styles.homeStatement}>Music, moving image and transmissions from an imagined future.</Text>
    </View>
    <NinaMotionHero onTalk={onTalk} busy={busy} paused={paused} />
    <View style={styles.section}><Kicker>NOW TRANSMITTING</Kicker><Hairline />
      <Text style={styles.editorialTitle}>STAY LOW</Text><Text style={styles.body}>MOLINARI × NINA FOK</Text>
      <ArrowButton label="ENTER MUSIC" onPress={() => setTab('MUSIC')} />
    </View>
    <View style={styles.section}><Kicker>THE WORLD</Kicker><Hairline />
      <Text style={styles.editorialTitle}>A possible Berlin. Thirty-seven years from now.</Text>
      <Text style={styles.body}>Fragments, films, people and objects from the Parallel Vision world.</Text>
      <ArrowButton label="DISCOVER 2063" onPress={() => setTab('2063')} />
    </View>
  </ScrollView>;
}

function NinaScreen({ onTalk, busy, paused }) {
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Kicker>NINA FOK / LIVE SIGNAL</Kicker>
    <Text style={styles.ninaIntro}>She's in Berlin, 2063. Speak with her live.</Text>
    <NinaMotionHero onTalk={onTalk} busy={busy} paused={paused} compact />
    <View style={styles.section}><Kicker>CONTINUITY</Kicker><Hairline />
      <Text style={styles.editorialTitle}>Your conversations continue here.</Text>
      <Text style={styles.body}>Your Parallel Vision account carries Nina continuity and live access across sessions.</Text>
    </View>
  </ScrollView>;
}

function WorldScreen() {
  const entries=[['01','THE CITY','Berlin as remembered, rebuilt and imagined.'],['02','FASHION AFTER FABRIC','Bodies, material and identity beyond conventional clothing.'],['03','TRANSMISSIONS','Short films, voices and fragments from the world.'],['04','PEOPLE','Artists and figures moving through Parallel Vision.']];
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Kicker>PARALLEL VISION / WORLD INDEX</Kicker><Text style={styles.pageTitle}>BERLIN{'\n'}2063</Text>
    <Text style={styles.body}>Not a timeline. An archive of signals from a possible future.</Text>
    {entries.map(([number,title,copy])=><View key={number} style={styles.worldCard}><Kicker>{number}</Kicker><Text style={styles.worldTitle}>{title}</Text><Text style={styles.body}>{copy}</Text></View>)}
    <ArrowButton label="OPEN CURRENT WEB ARCHIVE" onPress={()=>Linking.openURL(config.siteUrl)} />
  </ScrollView>;
}
function MusicScreen() {
  const releases=[['STAY LOW','Molinari × Nina FOK'],['TANZEN IM KREIS','Alejandro Molinari'],['DARK ROCK EP','Blex'],['BUILT TO LAST EP','REFRAKT']];
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Kicker>PARALLEL VISION / MUSIC</Kicker><Text style={styles.pageTitle}>CURRENT{'\n'}SIGNALS</Text>
    {releases.map(([title,artist],index)=><View key={title} style={styles.releaseRow}><Kicker>{String(index+1).padStart(2,'0')}</Kicker><View style={styles.releaseCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.body}>{artist} / 2026</Text></View></View>)}
    <ArrowButton label="OPEN LABEL CATALOGUE" onPress={()=>Linking.openURL(config.siteUrl)} />
  </ScrollView>;
}
function ProfileScreen({ pending, onCancel, onContinue, opening }) {
  return <KeyboardAvoidingView style={styles.content} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={54}>
    <ScrollView contentContainerStyle={styles.profileScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {pending && <View style={styles.signInNotice}><Text style={styles.notice}>Sign in to continue to Nina.</Text><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></Pressable></View>}
      <AuthPanel onContinue={onContinue} opening={opening} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

function ParallelVisionApp() {
  const {isLoaded,isSignedIn,getToken}=useAuth();
  const {session}=useSession();
  const [tab,setTab]=useState('HOME');
  const [live,setLive]=useState(false);
  const [pending,setPending]=useState(false);
  const [opening,setOpening]=useState(false);

  const openingRef=useRef(false);
  const openSequence=useRef(0);
  const signedInRef=useRef(isSignedIn); signedInRef.current=isSignedIn;
  const openLive=useCallback(async()=>{
    if(openingRef.current)return;
    if(!isLoaded){Alert.alert('Account loading','Please try again in a moment.');return;}
    if(!isSignedIn){setPending(true);setTab('PROFILE');return;}
    if(session?.currentTask){setTab('PROFILE');Alert.alert('Account verification','Complete the additional account verification before opening Nina.');return;}
    openingRef.current=true;setOpening(true);
    const sequence=++openSequence.current;
    try {
      const token=await withTimeout(getToken());
      if(sequence!==openSequence.current||!signedInRef.current)return;
      if(!token)throw new Error('Your session could not be confirmed. Sign in again.');
      setPending(false);setLive(true);
    }catch(error){if(sequence===openSequence.current){setPending(false);Alert.alert('Unable to open Nina',error?.message||'Please try again.');}}
    finally{if(sequence===openSequence.current){openingRef.current=false;setOpening(false);}}
  },[isLoaded,isSignedIn,getToken,session?.currentTask]);
  useEffect(()=>{if(pending&&isSignedIn&&!session?.currentTask)void openLive();},[pending,isSignedIn,session?.currentTask,openLive]);
  useEffect(()=>{ if(isLoaded&&!isSignedIn) setLive(false); },[isLoaded,isSignedIn]);
  const closeLive=useCallback(()=>{setLive(false);setTab('NINA');},[]);
  const showProfile=useCallback(()=>{setLive(false);setTab('PROFILE');},[]);
  const changeTab=next=>{openSequence.current++;openingRef.current=false;setOpening(false);setPending(false);setTab(next);};
  let screen;
  if(tab==='NINA')screen=<NinaScreen onTalk={openLive} busy={opening} paused={live} />;
  else if(tab==='2063')screen=<WorldScreen />;
  else if(tab==='MUSIC')screen=<MusicScreen />;
  else if(tab==='PROFILE')screen=<ProfileScreen opening={opening} pending={pending} onCancel={()=>changeTab('NINA')} onContinue={openLive} />;
  else screen=<HomeScreen setTab={changeTab} onTalk={openLive} busy={opening} paused={live} />;
  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
    <View style={styles.topbar}><Text style={styles.wordmark}>PARALLEL VISION</Text><Kicker>PV / 2063</Kicker></View>
    <View style={styles.content}>{screen}</View>
    <View style={styles.nav}>{tabs.map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:item===tab}} key={item} onPress={()=>changeTab(item)} style={styles.navItem}>
      <Text style={[styles.navText,item===tab&&styles.navTextActive]}>{item}</Text>{item===tab&&<View style={styles.navActive} />}
    </Pressable>)}</View>
    {live && <NinaLiveModal getToken={getToken} onClose={closeLive} onSignIn={showProfile} />}
  </SafeAreaView>;
}
export default function App(){return <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}><ParallelVisionApp /></ClerkProvider>;}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},content:{flex:1},
  topbar:{height:54,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.colors.line},
  wordmark:{color:theme.colors.text,fontSize:12,letterSpacing:2.6,fontWeight:'600'},
  scroll:{paddingHorizontal:18,paddingTop:24,paddingBottom:40},profileScroll:{paddingHorizontal:24,paddingTop:20,paddingBottom:24,flexGrow:1},
  kicker:{color:theme.colors.muted,fontSize:9,letterSpacing:1.8,fontWeight:'500'},
  homeIntro:{paddingBottom:22},homeStatement:{color:theme.colors.text,fontSize:23,lineHeight:30,letterSpacing:-0.6,fontWeight:'300',marginTop:14},
  heroSignal:{height:470,borderRadius:8,overflow:'hidden',backgroundColor:'#050505'},heroCompact:{height:420},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.24)'},
  heroTop:{position:'absolute',top:18,left:18,right:18,flexDirection:'row',justifyContent:'space-between'},heroBottom:{position:'absolute',left:18,right:18,bottom:18},
  heroName:{color:'#F2EFE9',fontSize:32,letterSpacing:-0.9,fontWeight:'300'},heroMeta:{color:'#D4D0C8',fontSize:13,marginTop:7},
  heroButton:{minHeight:54,marginTop:18,paddingHorizontal:16,borderRadius:3,borderWidth:1,borderColor:'#F2EFE9',backgroundColor:'rgba(0,0,0,0.72)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  heroButtonText:{color:'#F2EFE9',fontSize:12,letterSpacing:1.5,fontWeight:'500'},
  ninaIntro:{color:theme.colors.text,fontSize:26,lineHeight:33,fontWeight:'300',marginTop:14,marginBottom:24},
  pageTitle:{color:theme.colors.text,fontSize:44,lineHeight:47,fontWeight:'300',marginTop:18,marginBottom:18},
  section:{marginTop:36},hairline:{height:StyleSheet.hairlineWidth,backgroundColor:theme.colors.line,marginVertical:16},
  editorialTitle:{color:theme.colors.text,fontSize:27,lineHeight:33,fontWeight:'300'},body:{color:theme.colors.muted,fontSize:14,lineHeight:22,marginTop:10},
  button:{minHeight:48,marginTop:18,paddingHorizontal:14,borderRadius:3,borderWidth:StyleSheet.hairlineWidth,borderColor:'#555',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  buttonText:{color:theme.colors.text,fontSize:10,letterSpacing:1.4,fontWeight:'600'},arrow:{color:theme.colors.text,fontSize:20},pressed:{opacity:0.7},disabled:{opacity:0.5},
  worldCard:{minHeight:160,marginTop:18,padding:18,borderRadius:12,borderWidth:StyleSheet.hairlineWidth,borderColor:theme.colors.line,backgroundColor:theme.colors.panel},worldTitle:{color:theme.colors.text,fontSize:22,fontWeight:'300',marginTop:28},
  releaseRow:{minHeight:94,marginTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:theme.colors.line,flexDirection:'row',alignItems:'center'},releaseCopy:{flex:1,marginLeft:20},rowTitle:{color:theme.colors.text,fontSize:18,fontWeight:'300'},
  liveShell:{flex:1,backgroundColor:'#000'},liveHeader:{minHeight:64,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#262626'},liveHeading:{flex:1,marginRight:12},liveStatus:{color:'#99948B',fontSize:9,letterSpacing:1.3,marginTop:6},
  closeButton:{minWidth:74,minHeight:44,borderRadius:3,borderWidth:StyleSheet.hairlineWidth,borderColor:'#555',alignItems:'center',justifyContent:'center'},closeText:{color:'#F2EFE9',fontSize:10,letterSpacing:1.5},liveFrame:{flex:1,backgroundColor:'#000'},webview:{flex:1,backgroundColor:'#050505'},
  failure:{...StyleSheet.absoluteFillObject,padding:28,backgroundColor:'#080808',justifyContent:'center'},failureTitle:{color:theme.colors.text,fontSize:25,lineHeight:32,fontWeight:'300'},
  signInNotice:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},notice:{flex:1,color:theme.colors.signal,fontSize:13},cancel:{minHeight:44,paddingLeft:12,justifyContent:'center'},cancelText:{color:theme.colors.muted,fontSize:10,letterSpacing:1.2},
  nav:{minHeight:62,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:theme.colors.line,backgroundColor:'#050505',flexDirection:'row'},navItem:{flex:1,alignItems:'center',justifyContent:'center'},navText:{color:'#868179',fontSize:9,letterSpacing:1.2,fontWeight:'500'},navTextActive:{color:theme.colors.text},navActive:{width:18,height:1,backgroundColor:theme.colors.text,marginTop:8},
});
