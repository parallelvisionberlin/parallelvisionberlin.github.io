import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform,
  Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ClerkProvider, useAuth, useSession } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { theme } from './src/theme';
import { config } from './src/config';
import { AuthPanel } from './src/AuthPanel';
import { NinaLiveModal } from './src/NinaLiveModal';

const tabs = ['HOME', 'NINA', '2063', 'MUSIC', 'PROFILE'];
const ninaHeroVideo = `${config.siteUrl}/assets/optimized/video/nina-fok/ninaloophero-mobile.mp4`;
const ninaHeroPoster = `${config.siteUrl}/assets/optimized/nina-fok/HDNINACANON.webp`;
const ninaPortalImage = `${config.siteUrl}/assets/optimized/nina-fok/nina-window.webp`;
const sectionCodes = { HOME: 'PV / 01', NINA: 'SIGNAL / 02', '2063': 'WORLD / 03', MUSIC: 'AUDIO / 04', PROFILE: 'ID / 05' };

function Hairline() { return <View style={styles.hairline} />; }
function Kicker({ children, bright = false }) { return <Text style={[styles.kicker, bright && styles.kickerBright]}>{children}</Text>; }
function ArrowButton({ label, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <Text style={styles.buttonText}>{label}</Text><Text style={styles.arrow}>↗</Text>
  </Pressable>;
}

function NinaMotionHero({ onTalk, busy = false, paused = false }) {
  const videoRef = useRef(null);
  const heroHtml = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#050505}video{width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block}</style></head><body><video id="hero" autoplay muted loop playsinline webkit-playsinline preload="auto" poster="${ninaHeroPoster}" src="${ninaHeroVideo}"></video><script>var v=document.getElementById('hero');v.muted=true;v.play().catch(function(){});document.addEventListener('visibilitychange',function(){if(document.hidden)v.pause();else v.play().catch(function(){});});</script></body></html>`, []);
  useEffect(() => {
    videoRef.current?.injectJavaScript(`var v=document.getElementById('hero');if(v){${paused ? 'v.pause();' : 'v.play().catch(function(){});'}}true;`);
  }, [paused]);
  return (
    <View style={styles.heroSignal}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <WebView ref={videoRef} source={{ html: heroHtml, baseUrl: config.siteUrl }}
          style={styles.webview} scrollEnabled={false} bounces={false}
          allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false} onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === config.siteUrl || request.url === `${config.siteUrl}/`} />
      </View>
      <View pointerEvents="none" style={styles.heroShade} />
      <View pointerEvents="none" style={styles.heroTop}><Kicker bright>TRANSMISSION / LIVE</Kicker><Kicker bright>BERLIN / 2063</Kicker></View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroName}>NINA FOK</Text>
        <Text style={styles.heroMeta}>A conversation from an imagined Berlin.</Text>
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
    <View style={styles.homeIntro}>
      <View style={styles.homeTitleRow}><Text style={styles.homeTitle}>PARALLEL{`\n`}VISION</Text><Kicker>BERLIN / 2026</Kicker></View>
      <Text style={styles.homeStatement}>Music, moving image and transmissions from an imagined future.</Text>
    </View>
    <NinaMotionHero onTalk={onTalk} busy={busy} paused={paused} />
    <View style={styles.section}><View style={styles.sectionHeader}><Kicker>NOW TRANSMITTING</Kicker><Text style={styles.sectionNumber}>01</Text></View><Hairline />
      <Text style={styles.editorialTitle}>STAY LOW</Text><Text style={styles.body}>MOLINARI × NINA FOK</Text>
      <ArrowButton label="ENTER MUSIC" onPress={() => setTab('MUSIC')} />
    </View>
    <View style={styles.section}><View style={styles.sectionHeader}><Kicker>THE WORLD</Kicker><Text style={styles.sectionNumber}>02</Text></View><Hairline />
      <Text style={styles.editorialTitle}>Berlin, thirty-seven years from now.</Text>
      <Text style={styles.body}>Fragments, films, people and objects from the Parallel Vision world.</Text>
      <ArrowButton label="DISCOVER 2063" onPress={() => setTab('2063')} />
    </View>
  </ScrollView>;
}

function NinaScreen({ onTalk, busy }) {
  return <ScrollView contentContainerStyle={styles.ninaScroll} showsVerticalScrollIndicator={false}>
    <View style={styles.ninaSignalRow}>
      <Kicker>NINA FOK / PRIVATE CHANNEL</Kicker>
      <View style={styles.signalBadge}><View style={styles.signalDot} /><Text style={styles.signalText}>AVAILABLE</Text></View>
    </View>
    <View style={styles.ninaHeadingRow}>
      <Text style={styles.ninaPageName}>NINA{`\n`}FOK</Text>
      <Text style={styles.ninaIndex}>2063{`\n`}BERLIN</Text>
    </View>
    <Text style={styles.ninaPageLead}>She lives inside the Parallel Vision world. You can speak with her now.</Text>

    <View style={styles.ninaPortal}>
      <Image source={{ uri: ninaPortalImage }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.ninaPortalShade} />
      <View pointerEvents="none" style={styles.ninaPortalTop}><Text style={styles.portalCode}>LIVE SIGNAL / NINA FOK</Text></View>
      <View style={styles.ninaPortalBottom}>
        <Text style={styles.portalStatement}>A private transmission. She remembers when you return.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Talk to Nina" disabled={busy} onPress={onTalk}
          style={({ pressed }) => [styles.ninaPrimary, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#F2EFE9" /> : <><Text style={styles.ninaPrimaryText}>OPEN LIVE SIGNAL</Text><Text style={styles.arrow}>↗</Text></>}
        </Pressable>
      </View>
    </View>

    <View style={styles.ninaContinuity}>
      <View style={styles.sectionHeader}><Kicker>CONTINUITY / MEMORY</Kicker><Text style={styles.sectionNumber}>ACTIVE</Text></View>
      <Text style={styles.ninaContinuityTitle}>The conversation does not reset when you leave.</Text>
      <Text style={styles.ninaContinuityCopy}>Your Parallel Vision identity carries private conversation context forward between visits.</Text>
    </View>
  </ScrollView>;
}

function WorldScreen() {
  const entries=[['01','THE CITY','Berlin as remembered, rebuilt and imagined.'],['02','FASHION AFTER FABRIC','Bodies, material and identity beyond conventional clothing.'],['03','TRANSMISSIONS','Short films, voices and fragments from the world.'],['04','PEOPLE','Artists and figures moving through Parallel Vision.']];
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Kicker>PARALLEL VISION / WORLD INDEX</Kicker><Text style={styles.pageTitle}>BERLIN{`\n`}2063</Text>
    <Text style={styles.body}>Not a timeline. An archive of signals from a possible future.</Text>
    <View style={styles.indexList}>{entries.map(([number,title,copy])=><View key={number} style={styles.worldCard}><View style={styles.worldNumber}><Kicker>{number}</Kicker></View><View style={styles.worldCopy}><Text style={styles.worldTitle}>{title}</Text><Text style={styles.body}>{copy}</Text></View></View>)}</View>
    <ArrowButton label="OPEN CURRENT WEB ARCHIVE" onPress={()=>Linking.openURL(config.siteUrl)} />
  </ScrollView>;
}
function MusicScreen() {
  const releases=[['STAY LOW','Molinari × NINA FOK'],['TANZEN IM KREIS','Alejandro Molinari'],['DARK ROCK EP','Blex'],['BUILT TO LAST EP','REFRAKT']];
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Kicker>PARALLEL VISION / MUSIC</Kicker><Text style={styles.pageTitle}>CURRENT{`\n`}SIGNALS</Text>
    <View style={styles.indexList}>{releases.map(([title,artist],index)=><View key={title} style={styles.releaseRow}><Kicker>{String(index+1).padStart(2,'0')}</Kicker><View style={styles.releaseCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.body}>{artist} / 2026</Text></View><Text style={styles.rowArrow}>↗</Text></View>)}</View>
    <ArrowButton label="OPEN LABEL CATALOGUE" onPress={()=>Linking.openURL(config.siteUrl)} />
  </ScrollView>;
}
function ProfileScreen({ pending, onCancel, onContinue, opening }) {
  return <KeyboardAvoidingView style={styles.content} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={48}>
    <ScrollView contentContainerStyle={styles.profileScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.profileHeading}><Kicker>PARALLEL VISION / IDENTITY</Kicker><Text style={styles.profileTitle}>PROFILE</Text></View>
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
  const openLive=useCallback(async()=>{
    if(openingRef.current)return;
    if(!isLoaded){Alert.alert('Account loading','Please try again in a moment.');return;}
    if(!isSignedIn){setPending(true);setTab('PROFILE');return;}
    if(session?.currentTask){setTab('PROFILE');Alert.alert('Account verification','Complete the additional account verification before opening Nina.');return;}
    openingRef.current=true;setOpening(true);openSequence.current+=1;
    setPending(false);
    setLive(true);
    requestAnimationFrame(()=>{openingRef.current=false;setOpening(false);});
  },[isLoaded,isSignedIn,session?.currentTask]);
  useEffect(()=>{if(pending&&isSignedIn&&!session?.currentTask)void openLive();},[pending,isSignedIn,session?.currentTask,openLive]);
  useEffect(()=>{ if(isLoaded&&!isSignedIn) setLive(false); },[isLoaded,isSignedIn]);
  const closeLive=useCallback(()=>{setLive(false);setTab('NINA');},[]);
  const showProfile=useCallback(()=>{setLive(false);setTab('PROFILE');},[]);
  const changeTab=next=>{openSequence.current++;openingRef.current=false;setOpening(false);setPending(false);setTab(next);};
  let screen;
  if(tab==='NINA')screen=<NinaScreen onTalk={openLive} busy={opening} />;
  else if(tab==='2063')screen=<WorldScreen />;
  else if(tab==='MUSIC')screen=<MusicScreen />;
  else if(tab==='PROFILE')screen=<ProfileScreen opening={opening} pending={pending} onCancel={()=>changeTab('NINA')} onContinue={openLive} />;
  else screen=<HomeScreen setTab={changeTab} onTalk={openLive} busy={opening} paused={live} />;
  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
    <View style={styles.topbar}><Text style={styles.wordmark}>PARALLEL VISION</Text><Text style={styles.topbarCode}>{sectionCodes[tab]}</Text></View>
    <View style={styles.content}>{screen}</View>
    <View style={styles.nav}>{tabs.map((item,index)=><Pressable accessibilityRole="tab" accessibilityState={{selected:item===tab}} key={item} onPress={()=>changeTab(item)} style={styles.navItem}>
      <Text style={styles.navIndex}>{String(index+1).padStart(2,'0')}</Text><Text style={[styles.navText,item===tab&&styles.navTextActive]}>{item}</Text>{item===tab&&<View style={styles.navActive} />}
    </Pressable>)}</View>
    {live && <NinaLiveModal getToken={getToken} onClose={closeLive} onSignIn={showProfile} />}
  </SafeAreaView>;
}
export default function App(){return <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}><ParallelVisionApp /></ClerkProvider>;}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},content:{flex:1},
  topbar:{height:48,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#232323'},
  wordmark:{color:theme.colors.text,fontSize:11,letterSpacing:2.45,fontWeight:'600'},topbarCode:{color:'#77736D',fontSize:8,letterSpacing:1.55,fontWeight:'500'},
  scroll:{paddingHorizontal:18,paddingTop:22,paddingBottom:44},profileScroll:{paddingHorizontal:22,paddingTop:24,paddingBottom:28,flexGrow:1},
  kicker:{color:'#8E8981',fontSize:8.5,letterSpacing:1.7,fontWeight:'500'},kickerBright:{color:'rgba(242,239,233,.74)'},
  homeIntro:{paddingBottom:24},homeTitleRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},homeTitle:{color:'#F2EFE9',fontSize:38,lineHeight:38,letterSpacing:-1.8,fontWeight:'200'},homeStatement:{maxWidth:335,color:'#B7B2AA',fontSize:16,lineHeight:23,letterSpacing:-0.2,fontWeight:'300',marginTop:18},
  heroSignal:{height:485,overflow:'hidden',backgroundColor:'#050505',borderWidth:StyleSheet.hairlineWidth,borderColor:'#272727'},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.22)'},
  heroTop:{position:'absolute',top:17,left:17,right:17,flexDirection:'row',justifyContent:'space-between'},heroBottom:{position:'absolute',left:17,right:17,bottom:17},
  heroName:{color:'#F2EFE9',fontSize:35,letterSpacing:-1.2,fontWeight:'200'},heroMeta:{color:'#D4D0C8',fontSize:12.5,lineHeight:18,marginTop:7,fontWeight:'300'},
  heroButton:{minHeight:56,marginTop:18,paddingHorizontal:16,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(242,239,233,.78)',backgroundColor:'rgba(0,0,0,.64)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heroButtonText:{color:'#F2EFE9',fontSize:11,letterSpacing:1.65,fontWeight:'600'},
  section:{marginTop:38},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionNumber:{color:'#625F5A',fontSize:8,letterSpacing:1.3},hairline:{height:StyleSheet.hairlineWidth,backgroundColor:'#2A2927',marginVertical:15},
  editorialTitle:{color:theme.colors.text,fontSize:28,lineHeight:33,fontWeight:'250',letterSpacing:-.6},body:{color:'#918D86',fontSize:13.5,lineHeight:21,marginTop:9,fontWeight:'300'},
  button:{minHeight:50,marginTop:18,paddingHorizontal:14,borderWidth:StyleSheet.hairlineWidth,borderColor:'#4A4844',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},buttonText:{color:theme.colors.text,fontSize:9.5,letterSpacing:1.45,fontWeight:'600'},arrow:{color:theme.colors.text,fontSize:19},pressed:{opacity:0.62},disabled:{opacity:0.48},

  ninaScroll:{paddingHorizontal:18,paddingTop:20,paddingBottom:38},ninaSignalRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},signalBadge:{flexDirection:'row',alignItems:'center'},signalDot:{width:5,height:5,borderRadius:3,backgroundColor:'#F2EFE9',marginRight:7},signalText:{color:'#A7A29A',fontSize:8,letterSpacing:1.35},
  ninaHeadingRow:{marginTop:22,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},ninaPageName:{color:'#F2EFE9',fontSize:56,lineHeight:52,letterSpacing:-2.8,fontWeight:'200'},ninaIndex:{color:'#66625D',fontSize:9,lineHeight:14,letterSpacing:1.5,textAlign:'right'},ninaPageLead:{maxWidth:330,color:'#B8B3AA',fontSize:16,lineHeight:23,fontWeight:'300',marginTop:17,marginBottom:24},
  ninaPortal:{height:470,overflow:'hidden',backgroundColor:'#090909',borderWidth:StyleSheet.hairlineWidth,borderColor:'#282828'},ninaPortalShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.20)'},ninaPortalTop:{position:'absolute',top:16,left:16},portalCode:{color:'rgba(242,239,233,.68)',fontSize:8.5,letterSpacing:1.7},ninaPortalBottom:{position:'absolute',left:16,right:16,bottom:16},portalStatement:{maxWidth:285,color:'#F2EFE9',fontSize:17,lineHeight:23,fontWeight:'300'},
  ninaPrimary:{minHeight:57,marginTop:17,paddingHorizontal:16,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(242,239,233,.78)',backgroundColor:'rgba(0,0,0,.66)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},ninaPrimaryText:{color:'#F2EFE9',fontSize:10.5,letterSpacing:1.65,fontWeight:'600'},
  ninaContinuity:{marginTop:32,paddingTop:21,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#292826'},ninaContinuityTitle:{color:'#F2EFE9',fontSize:23,lineHeight:29,fontWeight:'250',letterSpacing:-.4,marginTop:13},ninaContinuityCopy:{color:'#918D86',fontSize:13,lineHeight:20,marginTop:11,maxWidth:335},

  pageTitle:{color:theme.colors.text,fontSize:46,lineHeight:44,fontWeight:'200',letterSpacing:-2,marginTop:20,marginBottom:17},indexList:{marginTop:28,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#292826'},
  worldCard:{minHeight:118,paddingVertical:20,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#292826',flexDirection:'row'},worldNumber:{width:48,paddingTop:3},worldCopy:{flex:1},worldTitle:{color:theme.colors.text,fontSize:20,fontWeight:'300',letterSpacing:-.35},
  releaseRow:{minHeight:92,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#292826',flexDirection:'row',alignItems:'center'},releaseCopy:{flex:1,marginLeft:20},rowTitle:{color:theme.colors.text,fontSize:18,fontWeight:'300',letterSpacing:-.25},rowArrow:{color:'#65615C',fontSize:17},
  webview:{flex:1,backgroundColor:'#050505'},
  profileHeading:{marginBottom:20},profileTitle:{color:'#F2EFE9',fontSize:39,lineHeight:44,fontWeight:'200',letterSpacing:-1.4,marginTop:14},signInNotice:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12,paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#2A2927'},notice:{flex:1,color:theme.colors.signal,fontSize:13},cancel:{minHeight:44,paddingLeft:12,justifyContent:'center'},cancelText:{color:theme.colors.muted,fontSize:10,letterSpacing:1.2},
  nav:{height:64,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#292826',backgroundColor:'#050505',flexDirection:'row'},navItem:{flex:1,alignItems:'center',justifyContent:'center',position:'relative'},navIndex:{color:'#4E4B47',fontSize:6.5,letterSpacing:.8,marginBottom:4},navText:{color:'#77736D',fontSize:8.2,letterSpacing:1.05,fontWeight:'500'},navTextActive:{color:'#F2EFE9'},navActive:{position:'absolute',top:-1,width:26,height:1,backgroundColor:'#F2EFE9'},
});
