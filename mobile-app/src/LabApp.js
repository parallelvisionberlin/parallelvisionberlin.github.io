import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,BackHandler,KeyboardAvoidingView,Linking,Modal,Platform,Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {ClerkProvider,useAuth,useClerk,useUser} from '@clerk/expo';
import {tokenCache} from '@clerk/expo/token-cache';
import {WebView} from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {AuthPanel} from './AuthPanel';
import {config} from './config';
import {isLabURL,LAB_STUDIO,LAB_MOODS,LAB_DISCOVER,labCommandScript,labReplyScript,moodCommand,nativeLabFlag,readLabMessage,sharePayload} from './labBridge';

function Button({children,onPress,selected=false}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.button,selected&&s.selected,pressed&&s.pressed]}><Text style={[s.buttonText,selected&&s.selectedText]}>{children}</Text></Pressable>;}
function LabWebSurface({source,web,onSignIn,onSignOut,onNavigate,onReady,onLoading,getIdentity,active}){
  const [attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const epoch=useRef(0),alive=useRef(true),pending=useRef(new Set()),sharing=useRef(false),pageId=useRef('');
  const identity=useRef(getIdentity);identity.current=getIdentity;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;};},[]);
  useEffect(()=>{const timer=setTimeout(()=>{if(loading)setError('Lab is taking longer to open. Check your connection and retry.');},30000);return()=>clearTimeout(timer);},[attempt,loading]);
  const receive=async event=>{
    const m=readLabMessage(event.nativeEvent);if(!m||!alive.current)return;
    if(m.type==='PV_LAB_AUTH'){
      if(pageId.current&&pageId.current!==m.pageId)return;
      pageId.current=m.pageId;const key=m.pageId+':'+m.id;if(pending.current.has(key)||pending.current.size>16)return;
      pending.current.add(key);const revision=epoch.current;let reply;
      try{reply=await Promise.race([identity.current(m.force===true),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),12000))]);}
      catch{reply={error:'refresh_failed'};}
      pending.current.delete(key);
      if(alive.current&&revision===epoch.current)web.current?.injectJavaScript(labReplyScript({...reply,id:m.id,pageId:m.pageId}));
    }else if(m.type==='PV_LAB_READY'){setLoading(false);setError('');onReady?.();}
    else if(m.type==='PV_LAB_SIGN_IN')onSignIn();
    else if(m.type==='PV_LAB_SIGN_OUT')onSignOut();
    else if(m.type==='PV_LAB_NOTICE')Alert.alert('PV Lab',String(m.message||'').slice(0,250));
    else if(m.type==='PV_LAB_SHARE'&&!sharing.current){
      sharing.current=true;let file;
      try{
        const data=sharePayload(m);if(!(await Sharing.isAvailableAsync()))throw Error('Sharing is unavailable on this device.');
        file=FileSystem.cacheDirectory+'pv-lab-'+Date.now()+'.'+data.extension;
        await FileSystem.writeAsStringAsync(file,data.base64,{encoding:FileSystem.EncodingType.Base64});
        await Sharing.shareAsync(file,{mimeType:data.mime,dialogTitle:'Save or share your image'});
      }catch(e){Alert.alert('Save image',e.message||'The image could not be shared.');}
      finally{if(file)await FileSystem.deleteAsync(file,{idempotent:true}).catch(()=>{});sharing.current=false;}
    }
  };
  return <View style={[s.surface,!active&&s.hidden]} accessibilityElementsHidden={!active} importantForAccessibility={active?'auto':'no-hide-descendants'}>
    <WebView key={attempt} ref={web} source={{uri:source}} style={s.web}
      injectedJavaScriptBeforeContentLoaded={nativeLabFlag} injectedJavaScriptBeforeContentLoadedForMainFrameOnly
      javaScriptEnabled domStorageEnabled sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
      allowsInlineMediaPlayback mediaPlaybackRequiresUserAction setSupportMultipleWindows={false}
      originWhitelist={['https://*']} bounces={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      decelerationRate={source===LAB_DISCOVER||source===LAB_STUDIO?'normal':'fast'}
      onMessage={receive}
      onLoadStart={()=>{onLoading?.();epoch.current++;pageId.current='';pending.current.clear();setLoading(true);setError('');}}
      onLoadEnd={()=>setLoading(false)}
      onError={()=>{setLoading(false);setError('Lab could not load. Check your connection and retry.');}}
      onHttpError={e=>{if(isLabURL(e.nativeEvent.url)&&e.nativeEvent.statusCode>=400){setLoading(false);setError('Lab is temporarily unavailable. Please retry.');}}}
      onContentProcessDidTerminate={()=>{setLoading(false);setError('The workspace was interrupted. Retry to reopen it. Your saved work remains in Gallery.');}}
      onShouldStartLoadWithRequest={request=>{
        if(request.isTopFrame===false)return true;
        if(isLabURL(request.url))return onNavigate(request.url)!==false;
        try{const u=new URL(request.url);if(u.protocol==='https:'&&['checkout.stripe.com','billing.stripe.com'].includes(u.hostname))Linking.openURL(u.href).catch(()=>Alert.alert('PV Lab','Could not open the payment page.'));}catch{}
        return false;
      }}/>
    {(loading||!!error)&&<View style={s.overlay}><Text style={s.eyebrow}>PARALLEL VISION / LAB</Text><Text style={s.loadingTitle}>{error?'Let’s reconnect.':'Your next mood.'}</Text>{error?<><Text style={s.copy}>{error}</Text><Button onPress={()=>{setError('');setLoading(true);setAttempt(n=>n+1);}}>Retry</Button></>:<ActivityIndicator color="#d9eb5d"/>}</View>}
  </View>;
}
function Workspace(){
  const {isLoaded,isSignedIn,getToken,userId,sessionId}=useAuth(),{signOut}=useClerk(),{user}=useUser();
  const [tab,setTab]=useState('moods'),[visitedStudio,setVisitedStudio]=useState(false),[visitedSaved,setVisitedSaved]=useState(false),[authOpen,setAuthOpen]=useState(false),[savedSource,setSavedSource]=useState(LAB_MOODS);
  const studio=useRef(null),discover=useRef(null),saved=useRef(null),queued=useRef(null),studioReady=useRef(false),current=useRef({}),resume=useRef(null);
  current.current={isLoaded,isSignedIn,userId,sessionId,getToken};
  const getIdentity=useCallback(async force=>{
    const start=current.current;if(!start.isLoaded)throw Error('Account loading');
    if(!start.isSignedIn)return {token:'',userId:'',sessionId:''};
    const token=await start.getToken({skipCache:force});
    if(current.current.sessionId!==start.sessionId||!current.current.isSignedIn)throw Error('Session changed');
    return {token:token||'',userId:start.userId,sessionId:start.sessionId};
  },[]);
  const send=command=>{if(studioReady.current&&studio.current){queued.current=null;studio.current.injectJavaScript(labCommandScript(command));}else queued.current=command;};
  const openStudio=(command={action:'create'})=>{
    queued.current=command;
    if(!isSignedIn){resume.current={kind:'studio',command};setAuthOpen(true);return;}
    setVisitedStudio(true);setTab(command.action==='gallery'?'gallery':'create');send(command);
  };
  const openSaved=url=>{if(!isSignedIn){resume.current={kind:'saved',url:url||LAB_MOODS};setAuthOpen(true);return;}setSavedSource(url||LAB_MOODS);setVisitedSaved(true);setTab('saved');};
  const select=next=>{
    if(next==='create'){openStudio();return;}
    if(next==='gallery'&&isSignedIn){openStudio({action:'gallery'});return;}
    setTab(next);
  };
  const logout=()=>Alert.alert('Sign out?','Your saved images and Moods stay in your account.',[{text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:async()=>{
    studioReady.current=false;queued.current=null;resume.current=null;setVisitedStudio(false);setVisitedSaved(false);setTab('moods');await signOut();
  }}]);
  useEffect(()=>{
    if(!isSignedIn)return;
    setAuthOpen(false);const next=resume.current;resume.current=null;
    if(next?.kind==='studio'){queued.current=next.command;setVisitedStudio(true);setTab(next.command.action==='gallery'?'gallery':'create');}
    if(next?.kind==='saved'){setSavedSource(next.url);setVisitedSaved(true);setTab('saved');}
  },[isSignedIn]);
  useEffect(()=>{const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(authOpen){setAuthOpen(false);return true;}if(tab!=='moods'){setTab('moods');return true;}return false;});return()=>listener.remove();},[authOpen,tab]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='active'&&studioReady.current&&['create','gallery'].includes(tab))studio.current?.injectJavaScript(labCommandScript({action:tab}));});return()=>listener.remove();},[tab]);
  const navigate=(url,from)=>{
    const u=new URL(url);
    if(u.pathname.endsWith('app-moods.html')){if(from==='discover')return true;setTab('moods');return false;}
    if(u.pathname.endsWith('mood-creator.html')){if(from==='saved')return true;openSaved(url);return false;}
    if(from!=='studio'){openStudio(moodCommand(url)||{action:'create'});return false;}
    return true;
  };
  const signIn=()=>{resume.current=null;setAuthOpen(true);};
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor="#080808"/>
    <View style={s.header}><Text style={s.brand}>PV LAB<Text style={s.brandSmall}>  / PARALLEL VISION</Text></Text><Text style={s.sectionLabel}>{tab==='saved'?'MY MOODS':tab.toUpperCase()}</Text></View>
    <View style={s.body}>{isLoaded?<>
      <LabWebSurface source={LAB_DISCOVER} web={discover} active={tab==='moods'} getIdentity={getIdentity} onSignIn={signIn} onSignOut={logout} onNavigate={url=>navigate(url,'discover')}/>
      {visitedStudio&&isSignedIn&&<LabWebSurface key={'studio-'+sessionId} source={LAB_STUDIO} web={studio} active={['create','gallery'].includes(tab)} getIdentity={getIdentity} onSignIn={()=>setAuthOpen(true)} onSignOut={logout} onNavigate={url=>navigate(url,'studio')} onLoading={()=>{studioReady.current=false;}} onReady={()=>{studioReady.current=true;const command=queued.current;queued.current=null;if(command)studio.current?.injectJavaScript(labCommandScript(command));}}/>}
      {visitedSaved&&<LabWebSurface key={'saved-'+(sessionId||'guest')} source={savedSource} web={saved} active={tab==='saved'} getIdentity={getIdentity} onSignIn={signIn} onSignOut={logout} onNavigate={url=>navigate(url,'saved')}/>}
      {tab==='gallery'&&!isSignedIn&&<View style={s.empty}><Text style={s.eyebrow}>YOUR PERSONAL COLLECTION</Text><Text style={s.loadingTitle}>Keep what{String.fromCharCode(10)}you create.</Text><Text style={s.copy}>Your images, ready to revisit, save and share.</Text><Button selected onPress={()=>openStudio({action:'gallery'})}>Sign in to your gallery</Button><Button onPress={()=>setTab('moods')}>Explore Moods</Button></View>}
      {tab==='profile'&&<ScrollView contentContainerStyle={s.profile}>
        <View style={s.profileIdentity}><Text style={s.eyebrow}>YOUR ACCOUNT</Text><Text style={s.profileName}>{isSignedIn?(user?.firstName||'Your Lab.'):'Your Lab.'}</Text><Text style={s.profileEmail}>{isSignedIn?user?.primaryEmailAddress?.emailAddress:'Sign in to save your images and Moods.'}</Text></View>
        {isSignedIn&&<Pressable accessibilityRole="button" accessibilityLabel="Lab credits" onPress={()=>openStudio({action:'credits'})} style={({pressed})=>[s.profileCredit,pressed&&s.pressed]}><Text style={s.profileCardTitle}>Lab credits</Text><Text style={s.profileCardCopy}>Balance and purchases</Text></Pressable>}
        <Text style={s.profileSection}>YOUR LIBRARY</Text>
        <View style={s.profileGroup}>
          <Pressable accessibilityRole="button" accessibilityLabel="My Moods" onPress={()=>openSaved()} style={({pressed})=>[s.profileCard,pressed&&s.pressed]}><View><Text style={s.profileRowTitle}>My Moods</Text><Text style={s.profileCardCopy}>Your saved looks</Text></View><Text style={s.profileChevron} aria-hidden>›</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="My gallery" onPress={()=>openStudio({action:'gallery'})} style={({pressed})=>[s.profileCard,pressed&&s.pressed]}><View><Text style={s.profileRowTitle}>My gallery</Text><Text style={s.profileCardCopy}>Your images and downloads</Text></View><Text style={s.profileChevron} aria-hidden>›</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={isSignedIn?logout:signIn} style={({pressed})=>[s.profileAccount,pressed&&s.pressed]}><Text style={s.profileAccountText}>{isSignedIn?'Sign out':'Sign in to your Lab'}</Text></Pressable>
        <Text style={s.profileFoot}>PARALLEL VISION / BERLIN</Text>
      </ScrollView>}
    </>:<ActivityIndicator color="#d9eb5d" style={s.loader}/>}</View>
    <View style={s.nav}>{[['gallery','▦','Gallery'],['moods','◈','Moods'],['create','＋','Create'],['profile','○','Profile']].map(([id,icon,label])=><Pressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:tab===id||(id==='profile'&&tab==='saved')}} onPress={()=>select(id)} style={s.tab}>{id==='create'?<View style={s.createIcon}><View style={s.plusHorizontal}/><View style={s.plusVertical}/></View>:<Text style={[s.tabIcon,(tab===id||(id==='profile'&&tab==='saved'))&&s.selectedText]}>{icon}</Text>}<Text style={[s.tabLabel,(tab===id||(id==='profile'&&tab==='saved'))&&s.selectedText]}>{label}</Text></Pressable>)}</View>
    <Modal visible={authOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setAuthOpen(false)}><SafeAreaView style={s.safe}><View style={s.header}><Text style={s.brand}>YOUR ACCOUNT</Text><Button onPress={()=>setAuthOpen(false)}>Close</Button></View><KeyboardAvoidingView style={s.body} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.profile} keyboardShouldPersistTaps="handled"><AuthPanel description="Your chosen Mood and photograph will be waiting for you." continueLabel="CONTINUE CREATING" onContinue={()=>setAuthOpen(false)}/></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}
export default function LabApp(){return <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}><Workspace/></ClerkProvider>;}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#080808'},body:{flex:1},surface:{flex:1},hidden:{display:'none'},web:{flex:1,backgroundColor:'#080808'},header:{height:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#2c3029'},brand:{color:'#eef0e9',fontSize:15,fontWeight:'700',letterSpacing:1},brandSmall:{fontSize:8,fontWeight:'400',letterSpacing:1.2,color:'#9da394'},account:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},accountText:{color:'#d9eb5d',fontSize:13},nav:{flexDirection:'row',justifyContent:'space-around',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#30332c',paddingHorizontal:0,paddingVertical:7,backgroundColor:'#0b0d09'},button:{minHeight:44,paddingHorizontal:18,paddingVertical:12,borderRadius:10,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:'#252c16'},buttonText:{color:'#a6ab9f',fontSize:13,fontWeight:'500'},selectedText:{color:'#dfed93'},pressed:{opacity:.6},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'#080808',justifyContent:'center',padding:28,gap:20},eyebrow:{color:'#959c8c',fontSize:10,letterSpacing:2},loadingTitle:{color:'#f1f1e9',fontSize:36,fontWeight:'400',letterSpacing:-1.2},copy:{color:'#a9afa1',fontSize:15,lineHeight:23,marginVertical:16},sectionLabel:{fontSize:9,letterSpacing:1.4,color:'#9da394'},tab:{flex:1,minHeight:54,alignItems:'center',justifyContent:'center',gap:3},galleryTab:{flex:2},createIcon:{width:36,height:36,borderRadius:18,backgroundColor:'#dfed93',alignItems:'center',justifyContent:'center'},plusHorizontal:{position:'absolute',width:16,height:1.5,backgroundColor:'#10130b'},plusVertical:{position:'absolute',width:1.5,height:16,backgroundColor:'#10130b'},tabIcon:{fontSize:24,color:'#8f948b'},tabLabel:{fontSize:10,color:'#8f948b',fontWeight:'500'},empty:{flex:1,padding:28,justifyContent:'center'},profileIdentity:{gap:8,marginBottom:24},profileName:{color:'#f1f1e9',fontSize:30,fontWeight:'400',letterSpacing:-.9},profileEmail:{color:'#9ca394',fontSize:13,lineHeight:19},profileCredit:{minHeight:86,padding:18,gap:6,borderWidth:StyleSheet.hairlineWidth,borderColor:'#414735',backgroundColor:'#151a11',borderRadius:12},profileSection:{color:'#92998b',fontSize:9,letterSpacing:1.6,marginTop:26,marginBottom:10},profileGroup:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#30352c'},profileCard:{minHeight:76,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#30352c'},profileCardTitle:{color:'#eeeee5',fontSize:20,fontWeight:'500',letterSpacing:-.4},profileRowTitle:{color:'#eeeee5',fontSize:16,fontWeight:'500',marginBottom:4},profileCardCopy:{color:'#9ca394',fontSize:12,lineHeight:18},profileChevron:{color:'#a5ad99',fontSize:25,fontWeight:'300'},profileAccount:{minHeight:48,alignItems:'flex-start',justifyContent:'center',marginTop:20},profileAccountText:{color:'#b1b7a8',fontSize:13},profileFoot:{color:'#737a6b',fontSize:8,letterSpacing:1.7,marginTop:30},profile:{padding:22,paddingTop:28,flexGrow:1},loader:{flex:1}});
