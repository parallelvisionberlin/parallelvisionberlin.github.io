import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,BackHandler,KeyboardAvoidingView,Linking,Modal,Platform,Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {ClerkProvider,useAuth,useClerk,useUser} from '@clerk/expo';
import {tokenCache} from '@clerk/expo/token-cache';
import {WebView} from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {AuthPanel} from './AuthPanel';
import {config} from './config';
import {isLabURL,LAB_STUDIO,LAB_MOODS,labCommandScript,labReplyScript,moodCommand,nativeLabFlag,readLabMessage,sharePayload} from './labBridge';

function Button({children,onPress,selected=false}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.button,selected&&s.selected,pressed&&s.pressed]}><Text style={[s.buttonText,selected&&s.selectedText]}>{children}</Text></Pressable>;}
function LabWebSurface({source,web,onSignIn,onSignOut,onNavigate,onReady,getIdentity,active}){
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
      onMessage={receive}
      onLoadStart={()=>{epoch.current++;pageId.current='';pending.current.clear();setLoading(true);setError('');}}
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
  const [tab,setTab]=useState('create'),[visitedMoods,setVisitedMoods]=useState(false),[profile,setProfile]=useState(false),[moodsSource,setMoodsSource]=useState(LAB_MOODS);
  const studio=useRef(null),moods=useRef(null),queued=useRef(null),current=useRef({});
  current.current={isLoaded,isSignedIn,userId,sessionId,getToken};
  const getIdentity=useCallback(async force=>{
    const start=current.current;if(!start.isLoaded)throw Error('Account loading');
    if(!start.isSignedIn)return {token:'',userId:'',sessionId:''};
    const token=await start.getToken({skipCache:force});
    if(current.current.sessionId!==start.sessionId||!current.current.isSignedIn)throw Error('Session changed');
    return {token:token||'',userId:start.userId,sessionId:start.sessionId};
  },[]);
  const send=command=>{queued.current=command;studio.current?.injectJavaScript(labCommandScript(command));};
  const select=next=>{setTab(next);if(next==='moods')setVisitedMoods(true);else send({action:next});};
  const logout=()=>Alert.alert('Sign out?','Your saved Lab images and Moods stay in your account.',[{text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:async()=>{await signOut();setProfile(false);setTab('create');setVisitedMoods(false);queued.current=null;}}]);
  useEffect(()=>{if(isSignedIn)setProfile(false);},[isSignedIn]);
  useEffect(()=>{const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(profile){setProfile(false);return true;}if(tab!=='create'){select('create');return true;}return false;});return()=>handler.remove();},[profile,tab]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='active'&&tab!=='moods')studio.current?.injectJavaScript(labCommandScript({action:tab}));});return()=>listener.remove();},[tab]);
  const navigate=(url,fromMoods=false)=>{
    const u=new URL(url);
    if(u.pathname.endsWith('mood-creator.html')){if(fromMoods)return true;setMoodsSource(url);setVisitedMoods(true);setTab('moods');return false;}
    if(fromMoods){setTab('create');send(moodCommand(url)||{action:'create'});return false;}
    return true;
  };
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor="#080808"/>
    <View style={s.header}><Text style={s.brand}>PV LAB<Text style={s.brandSmall}>  / PARALLEL VISION</Text></Text><Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={()=>setProfile(true)} style={s.account}><Text style={s.accountText}>{isSignedIn?(user?.firstName?.[0]||'◎'):'Sign in'}</Text></Pressable></View>
    <View style={s.body}>{isLoaded?<>
      <LabWebSurface key={'studio-'+(sessionId||'guest')} source={LAB_STUDIO} web={studio} active={tab!=='moods'} getIdentity={getIdentity} onSignIn={()=>setProfile(true)} onSignOut={logout} onNavigate={url=>navigate(url)} onReady={()=>{if(queued.current)studio.current?.injectJavaScript(labCommandScript(queued.current));}}/>
      {visitedMoods&&<LabWebSurface key={'moods-'+(sessionId||'guest')} source={moodsSource} web={moods} active={tab==='moods'} getIdentity={getIdentity} onSignIn={()=>setProfile(true)} onSignOut={logout} onNavigate={url=>navigate(url,true)}/>}
    </>:<ActivityIndicator color="#d9eb5d" style={s.loader}/>}</View>
    <View style={s.nav}><Button selected={tab==='create'} onPress={()=>select('create')}>Create</Button><Button selected={tab==='moods'} onPress={()=>select('moods')}>My Moods</Button><Button selected={tab==='gallery'} onPress={()=>select('gallery')}>Gallery</Button></View>
    <Modal visible={profile} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setProfile(false)}><SafeAreaView style={s.safe}><View style={s.header}><Text style={s.brand}>YOUR ACCOUNT</Text><Button onPress={()=>setProfile(false)}>Close</Button></View><KeyboardAvoidingView style={s.body} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.profile} keyboardShouldPersistTaps="handled">
      {isSignedIn?<><Text style={s.loadingTitle}>{user?.firstName||'Your Lab.'}</Text><Text style={s.copy}>{user?.primaryEmailAddress?.emailAddress}</Text><Button onPress={()=>{setProfile(false);setTab('create');send({action:'credits'});}}>Lab credits</Button><Button onPress={logout}>Sign out</Button></>:<AuthPanel description="Your images, saved Moods and Lab credits." continueLabel="OPEN LAB" onContinue={()=>setProfile(false)}/>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}
export default function LabApp(){return <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}><Workspace/></ClerkProvider>;}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#080808'},body:{flex:1},surface:{flex:1},hidden:{display:'none'},web:{flex:1,backgroundColor:'#080808'},header:{height:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#2c3029'},brand:{color:'#eef0e9',fontSize:15,fontWeight:'700',letterSpacing:1},brandSmall:{fontSize:8,fontWeight:'400',letterSpacing:1.2,color:'#9da394'},account:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},accountText:{color:'#d9eb5d',fontSize:13},nav:{flexDirection:'row',justifyContent:'space-around',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#30332c',paddingHorizontal:10,paddingVertical:7,backgroundColor:'#0b0d09'},button:{minHeight:44,paddingHorizontal:18,paddingVertical:12,borderRadius:10,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:'#252c16'},buttonText:{color:'#a6ab9f',fontSize:13,fontWeight:'500'},selectedText:{color:'#dfed93'},pressed:{opacity:.6},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'#080808',justifyContent:'center',padding:28,gap:20},eyebrow:{color:'#959c8c',fontSize:10,letterSpacing:2},loadingTitle:{color:'#f1f1e9',fontSize:36,fontWeight:'400',letterSpacing:-1.2},copy:{color:'#a9afa1',fontSize:15,lineHeight:23,marginVertical:16},profile:{padding:24,flexGrow:1},loader:{flex:1}});
