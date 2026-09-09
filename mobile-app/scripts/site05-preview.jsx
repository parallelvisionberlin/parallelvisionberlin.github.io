// Test-only browser rendering of the actual screen components.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {View,Text,ScrollView,StyleSheet} from 'react-native';
import {DeckHome,DeckNina,Deck2063,DeckMusic,DeckNav} from '../src/DeckScreens';
import {NativeAccount} from '../src/NativeAccount';
import {ProjectReader} from '../src/ProjectReader';
const realFetch=window.fetch;
window.fetch=async(url,o)=>{if(String(url).startsWith('https://parallel-vision-anam-token.parallelvision.workers.dev'))return {ok:true,status:200,json:async()=>({role:'user',displayName:'Test visitor',preferences:{preferredName:'Test visitor',language:'en',newsletterUpdates:false,ninaTransmissions:true},balance:60,remainingSeconds:360,transactions:[],purchases:[],referral_link:'https://parallelvisionlabel.com/?ref=ABCDEFGH'})};return realFetch(url,o);};
function Preview(){const [tab,setTab]=useState(new URLSearchParams(location.search).get('tab')||'HOME'),[project,setProject]=useState(null);let screen=tab==='HOME'?<DeckHome setTab={setTab}/>:tab==='NINA'?<DeckNina onTalk={()=>{}} onRead={setProject}/>:tab==='2063'?<Deck2063 onRead={setProject}/>:tab==='MUSIC'?<DeckMusic/>:<ScrollView style={{flex:1}} contentContainerStyle={{padding:22}}><NativeAccount onContinue={()=>{}}/></ScrollView>;return <View style={{height:'100%',backgroundColor:'#070707'}}><View style={{height:42,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:'#f0ede5',fontSize:11,letterSpacing:2.5}}>PARALLEL VISION</Text><Text style={{color:'#79746b',fontSize:8,letterSpacing:1.6}}>PV / 2063</Text></View><View style={{flex:1,minHeight:0}}>{screen}</View><DeckNav tab={tab} onChange={setTab}/>{project&&<ProjectReader project={project} onClose={()=>setProject(null)}/>}</View>;}
createRoot(document.getElementById('root')).render(<Preview/>);
