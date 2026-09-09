import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {ClerkProvider,useAuth,useSession} from '@clerk/expo';
import {tokenCache} from '@clerk/expo/token-cache';
import {config} from './src/config';
import {AuthPanel} from './src/AuthPanel';
import {NinaLiveModal} from './src/NinaLiveModal';
import {DeckHome,DeckNina,Deck2063,DeckMusic,DeckNav} from './src/DeckScreens';
import {NativeAccount} from './src/NativeAccount';
import {ProjectReader} from './src/ProjectReader';
import {SITE_REVISION} from './src/site05Model';

function ProfileScreen({pending,onCancel,onContinue,opening}){
  const {isSignedIn}=useAuth();
  return <KeyboardAvoidingView style={styles.content} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={48}>
    <ScrollView contentContainerStyle={styles.profileScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {pending&&<View style={styles.signInNotice}><Text style={styles.notice}>Sign in to continue to Nina.</Text><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></Pressable></View>}
      {isSignedIn?<NativeAccount onContinue={onContinue} opening={opening}/>:<AuthPanel onContinue={onContinue} opening={opening}/>}
      <Text style={styles.revision}>{SITE_REVISION}</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
function ParallelVisionApp(){
  const {isLoaded,isSignedIn,getToken}=useAuth();const {session}=useSession();
  const [tab,setTab]=useState('HOME'),[live,setLive]=useState(false),[pending,setPending]=useState(false),[opening,setOpening]=useState(false),[project,setProject]=useState(null);
  const openingRef=useRef(false);
  const openLive=useCallback(async()=>{
    if(openingRef.current)return;
    if(!isLoaded){Alert.alert('Account loading','Please try again in a moment.');return;}
    if(!isSignedIn){setPending(true);setTab('PROFILE');return;}
    if(session?.currentTask){setTab('PROFILE');Alert.alert('Account verification','Complete the additional account verification before opening Nina.');return;}
    openingRef.current=true;setOpening(true);setPending(false);setLive(true);
    requestAnimationFrame(()=>{openingRef.current=false;setOpening(false);});
  },[isLoaded,isSignedIn,session?.currentTask]);
  useEffect(()=>{if(pending&&isSignedIn&&!session?.currentTask)void openLive();},[pending,isSignedIn,session?.currentTask,openLive]);
  useEffect(()=>{if(isLoaded&&!isSignedIn)setLive(false);},[isLoaded,isSignedIn]);
  const closeLive=useCallback(()=>{setLive(false);setTab('NINA');},[]);
  const showProfile=useCallback(()=>{setLive(false);setTab('PROFILE');},[]);
  const changeTab=next=>{openingRef.current=false;setOpening(false);setPending(false);setTab(next);};
  const paused=live||!!project;
  let screen;
  if(tab==='NINA')screen=<DeckNina onTalk={openLive} busy={opening} paused={paused} onRead={setProject}/>;
  else if(tab==='2063')screen=<Deck2063 onRead={setProject}/>;
  else if(tab==='MUSIC')screen=<DeckMusic/>;
  else if(tab==='PROFILE')screen=<ProfileScreen opening={opening} pending={pending} onCancel={()=>changeTab('NINA')} onContinue={openLive}/>;
  else screen=<DeckHome setTab={changeTab} paused={paused}/>;
  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#070707"/>
    <View style={styles.topbar}><Text style={styles.wordmark}>PARALLEL VISION</Text><Text style={styles.topbarCode}>PV / 2063</Text></View>
    <View style={styles.content}>{screen}</View><DeckNav tab={tab} onChange={changeTab}/>
    {project&&<ProjectReader project={project} onClose={()=>setProject(null)}/>}
    {live&&<NinaLiveModal getToken={getToken} onClose={closeLive} onSignIn={showProfile}/>}
  </SafeAreaView>;
}
export default function App(){return <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}><ParallelVisionApp/></ClerkProvider>;}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#070707'},content:{flex:1},topbar:{height:48,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#292622'},wordmark:{color:'#f0ede5',fontSize:11,letterSpacing:2.5,fontWeight:'600'},topbarCode:{color:'#79746b',fontSize:8,letterSpacing:1.6},profileScroll:{paddingHorizontal:22,paddingTop:24,paddingBottom:32,flexGrow:1},signInNotice:{flexDirection:'row',alignItems:'center',paddingVertical:12,marginBottom:14,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#34312d'},notice:{flex:1,color:'#ccc6ba',fontSize:13},cancel:{minHeight:44,paddingLeft:12,justifyContent:'center'},cancelText:{color:'#aaa397',fontSize:10,letterSpacing:1.2},revision:{color:'#676157',fontSize:8,letterSpacing:1.5,marginTop:30}});
