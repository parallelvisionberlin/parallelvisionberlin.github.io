import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { ClerkProvider, useAuth, useSession } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { theme } from './src/theme';
import { AuthPanel } from './src/AuthPanel';
import { NinaLiveModal } from './src/NinaLiveModal';
import { DeckHome, DeckNina, Deck2063, DeckMusic, DeckProfileMenu, DeckNav } from './src/DeckScreens';

function ProfileScreen({pending,onCancel,onContinue,opening}){
  return <KeyboardAvoidingView style={styles.content} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={48}>
    <ScrollView contentContainerStyle={styles.profileScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.profileHeading}><Text style={styles.kicker}>PARALLEL VISION / IDENTITY</Text><Text style={styles.profileTitle}>PROFILE</Text></View>
      {pending&&<View style={styles.signInNotice}><Text style={styles.notice}>Sign in to continue to Nina.</Text><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></Pressable></View>}
      <DeckProfileMenu><AuthPanel onContinue={onContinue} opening={opening}/></DeckProfileMenu>
      <Text style={styles.revision}>SITE COHESION / 05</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function ParallelVisionApp(){
  const {isLoaded,isSignedIn,getToken}=useAuth();
  const {session}=useSession();
  const [tab,setTab]=useState('HOME');
  const [live,setLive]=useState(false);
  const [pending,setPending]=useState(false);
  const [opening,setOpening]=useState(false);
  const openingRef=useRef(false);

  const openLive=useCallback(async()=>{
    if(openingRef.current)return;
    if(!isLoaded){Alert.alert('Account loading','Please try again in a moment.');return;}
    if(!isSignedIn){setPending(true);setTab('PROFILE');return;}
    if(session?.currentTask){setTab('PROFILE');Alert.alert('Account verification','Complete the additional account verification before opening Nina.');return;}
    openingRef.current=true;
    setOpening(true);
    setPending(false);
    setLive(true);
    requestAnimationFrame(()=>{openingRef.current=false;setOpening(false);});
  },[isLoaded,isSignedIn,session?.currentTask]);

  useEffect(()=>{if(pending&&isSignedIn&&!session?.currentTask)void openLive();},[pending,isSignedIn,session?.currentTask,openLive]);
  useEffect(()=>{if(isLoaded&&!isSignedIn)setLive(false);},[isLoaded,isSignedIn]);

  const closeLive=useCallback(()=>{setLive(false);setTab('NINA');},[]);
  const showProfile=useCallback(()=>{setLive(false);setTab('PROFILE');},[]);
  const changeTab=next=>{openingRef.current=false;setOpening(false);setPending(false);setTab(next);};

  let screen;
  if(tab==='NINA')screen=<DeckNina onTalk={openLive} setTab={changeTab}/>;
  else if(tab==='2063')screen=<Deck2063 setTab={changeTab}/>;
  else if(tab==='MUSIC')screen=<DeckMusic/>;
  else if(tab==='PROFILE')screen=<ProfileScreen opening={opening} pending={pending} onCancel={()=>changeTab('NINA')} onContinue={openLive}/>;
  else screen=<DeckHome setTab={changeTab} onTalk={openLive}/>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg}/>
    <View style={styles.topbar}><Text style={styles.wordmark}>PARALLEL VISION</Text><Text style={styles.topbarCode}>PV / 2063</Text></View>
    <View style={styles.content}>{screen}</View>
    <DeckNav tab={tab} onChange={changeTab}/>
    {live&&<NinaLiveModal getToken={getToken} onClose={closeLive} onSignIn={showProfile}/>} 
  </SafeAreaView>;
}

export default function App(){return <ClerkProvider publishableKey={require('./src/config').config.clerkPublishableKey} tokenCache={tokenCache}><ParallelVisionApp/></ClerkProvider>;}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},content:{flex:1},
  topbar:{height:48,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#232825'},
  wordmark:{color:'#f0f1eb',fontSize:11,letterSpacing:2.5,fontWeight:'600'},topbarCode:{color:'#737a74',fontSize:8,letterSpacing:1.6},
  profileScroll:{paddingHorizontal:20,paddingTop:24,paddingBottom:34,flexGrow:1},profileHeading:{marginBottom:20},kicker:{color:'#969b95',fontSize:9,letterSpacing:1.8},profileTitle:{color:'#f0f1ec',fontSize:44,lineHeight:48,fontWeight:'200',letterSpacing:-1.5,marginTop:14},
  signInNotice:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14,paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#303530'},notice:{flex:1,color:'#c8cbc3',fontSize:13},cancel:{minHeight:44,paddingLeft:12,justifyContent:'center'},cancelText:{color:'#8c918a',fontSize:10,letterSpacing:1.2},revision:{color:'#59605a',fontSize:8,letterSpacing:1.5,marginTop:24}
});