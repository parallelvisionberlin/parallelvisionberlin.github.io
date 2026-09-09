import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { config } from './config';

const portrait = require('../assets/deck04/nina-portrait.jpg');
const icons = {
 HOME: require('../assets/deck04/home.png'), NINA: require('../assets/deck04/nina.png'),
 '2063': require('../assets/deck04/world.png'), MUSIC: require('../assets/deck04/music.png'),
 PROFILE: require('../assets/deck04/profile.png'),
};
const cityPoster = `${config.siteUrl}/assets/optimized/2063/POV%20DARK%20HARMONY.webp`;
const cityVideo = `${config.siteUrl}/assets/optimized/video/2063/darkharmonyhero-mobile.mp4`;
const tabs = ['HOME', 'NINA', '2063', 'MUSIC', 'PROFILE'];
const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function Label({children, style}) {return <Text style={[s.label,style]}>{children}</Text>;}
function Button({children,onPress,disabled=false}) {return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,pressed&&s.pressed,disabled&&s.disabled]}><Text style={s.buttonText}>{children}</Text><Text style={s.arrow}>↗</Text></Pressable>;}

function CityFilm({paused}) {
 const ref=useRef(null); const {width,height}=useWindowDimensions();
 const html=useMemo(()=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;background:#070909;overflow:hidden}video{width:100%;height:100%;object-fit:cover;object-position:50% 50%}video::-webkit-media-controls,video::-webkit-media-controls-start-playback-button{display:none!important;-webkit-appearance:none}</style></head><body><video id="city" muted autoplay loop playsinline webkit-playsinline preload="auto" poster="${escape(cityPoster)}" src="${escape(cityVideo)}"></video><script>var v=document.getElementById('city');var paused=false;window.__PV_SET_HERO_PAUSED__=function(p){paused=p;if(paused)v.pause();else{v.muted=true;v.play().catch(function(){});}};document.addEventListener('visibilitychange',function(){if(document.hidden)v.pause();else if(!paused)v.play().catch(function(){});});v.muted=true;v.play().catch(function(){});</script></body></html>`,[]);
 const sync=()=>ref.current?.injectJavaScript(`window.__PV_SET_HERO_PAUSED__?.(${Boolean(paused)});true;`);
 useEffect(sync,[paused]);
 return <View style={[s.city,{height:Math.min(540,Math.max(330,Math.min(height*.56,width*1.18)))}]}>
  <Image accessibilityIgnoresInvertColors source={{uri:cityPoster}} style={StyleSheet.absoluteFillObject} resizeMode="cover"/>
  <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
   <WebView ref={ref} source={{html,baseUrl:config.siteUrl}} style={s.film} scrollEnabled={false} bounces={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false} onLoadEnd={sync} onShouldStartLoadWithRequest={r=>r.url==='about:blank'||r.url===config.siteUrl||r.url===config.siteUrl+'/'} />
  </View>
  <View pointerEvents="none" style={s.cityTop}><Label>BERLIN / 2063</Label><Label>PARALLEL VISION</Label></View>
  <View pointerEvents="none" style={s.cityCaption}><Text style={s.tagline}>Music, moving image and transmissions from an imagined future.</Text></View>
 </View>;
}
export function DeckHome({setTab,onTalk,busy,paused}) {
 return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.page}>
  <CityFilm paused={paused}/>
  <View style={s.inset}>
   <View style={s.feature}>
    <Image source={portrait} style={s.featureImage} resizeMode="cover"/>
    <View style={s.featureCopy}><Label>NINA / LIVE SIGNAL</Label><Label style={s.subLabel}>BERLIN 2063</Label><Text style={s.featureTitle}>NINA</Text><Text style={s.featureBody}>Conversations. Ideas. Another tomorrow.</Text><Button onPress={onTalk} disabled={busy}>TALK TO NINA</Button></View>
   </View>
   <View style={s.sectionHeading}><Label>EXPLORE 2063</Label><Pressable accessibilityRole="button" onPress={()=>setTab('2063')} style={s.smallLink}><Text style={s.linkText}>SEE ALL  ↗</Text></Pressable></View>
   <View style={s.exploreRow}>{[['PLACES','Berlin 2063','2063'],['MUSIC','Current signals','MUSIC'],['NINA','The live signal','NINA']].map(([name,copy,tab])=><Pressable accessibilityRole="button" accessibilityLabel={name} onPress={()=>setTab(tab)} key={name} style={({pressed})=>[s.exploreTile,pressed&&s.pressed]}><Image source={{uri:cityPoster}} style={s.exploreImage}/><View style={s.exploreCopy}><Label>{name}</Label><Text style={s.tileText}>{copy}</Text></View></Pressable>)}</View>
   <View style={s.release}><Label>PARALLEL VISION / MUSIC</Label><Text style={s.releaseTitle}>STAY LOW</Text><Text style={s.featureBody}>Alejandro Molinari × Nina FOK</Text><Button onPress={()=>setTab('MUSIC')}>EXPLORE MUSIC</Button></View>
  </View>
 </ScrollView>;
}
export function DeckNina({onTalk,busy,setTab}) {
 const {width,height}=useWindowDimensions();
 return <ScrollView contentContainerStyle={[s.page,s.inset]} showsVerticalScrollIndicator={false}>
  <View style={s.ninaHeading}><View><Label>NINA FOK / LIVE SIGNAL</Label><Text style={s.ready}>BERLIN, 2063</Text></View><Pressable accessibilityRole="button" accessibilityLabel="About Nina" onPress={()=>Linking.openURL(`${config.siteUrl}/nina-project.html`)} style={s.about}><Label>ABOUT ↗</Label></Pressable></View>
  <View style={[s.portal,{height:Math.min(670,Math.max(490,Math.min(height*.74,width*1.62)))}]}>
   <Image accessibilityLabel="Nina in her Berlin room" accessibilityIgnoresInvertColors source={portrait} style={StyleSheet.absoluteFillObject} resizeMode="cover"/>
   <View style={s.portalTop}><Label>LIVE CONVERSATION</Label><Label>PV / 2063</Label></View>
   <View style={s.portalBottom}><Text style={s.portalCopy}>She's in Berlin, 2063. Speak with her live.</Text><Button onPress={onTalk} disabled={busy}>TALK TO NINA</Button><View style={s.previewMic} accessible accessibilityLabel="Microphone is off until you start a conversation"><View style={s.idleLine}/><Image source={require('../assets/deck04/mic.png')} style={s.micIcon}/><View style={s.idleLine}/></View><Text style={s.previewLabel}>CONNECT TO BEGIN</Text></View>
  </View>
  <View style={s.sectionHeading}><Label>BEYOND THE SIGNAL</Label></View>
  <View style={s.links}><Button onPress={()=>setTab('2063')}>EXPLORE BERLIN 2063</Button><Button onPress={()=>setTab('PROFILE')}>YOUR PARALLEL VISION ID</Button></View>
 </ScrollView>;
}
export function DeckNav({tab,onChange}) {return <View accessibilityRole="tablist" style={s.nav}>{tabs.map(item=><Pressable accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{selected:item===tab}} onPress={()=>onChange(item)} key={item} style={({pressed})=>[s.navItem,pressed&&s.pressed]}><Image source={icons[item]} style={[s.navIcon,item!==tab&&s.navInactive]}/><Text style={[s.navText,item===tab&&s.activeText]}>{item}</Text><View style={[s.navDot,item!==tab&&s.invisible]}/></Pressable>)}</View>;}
const s=StyleSheet.create({
 page:{paddingBottom:30,backgroundColor:'#030404'},inset:{paddingHorizontal:16},label:{color:'#c5c5bf',fontSize:9,letterSpacing:1.7,lineHeight:15,fontWeight:'400'},subLabel:{color:'#92958f',marginTop:4},pressed:{opacity:.65},disabled:{opacity:.55},
 city:{overflow:'hidden',backgroundColor:'#070909'},film:{flex:1,backgroundColor:'transparent'},cityTop:{position:'absolute',left:18,right:18,top:18,flexDirection:'row',justifyContent:'space-between'},cityCaption:{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:27,paddingVertical:20,backgroundColor:'rgba(0,0,0,.76)'},tagline:{color:'#e9e9e4',fontSize:14,lineHeight:23,letterSpacing:.75,textAlign:'center',fontWeight:'300'},
 feature:{marginTop:18,minHeight:240,borderWidth:StyleSheet.hairlineWidth,borderColor:'#444845',borderRadius:5,overflow:'hidden',backgroundColor:'#070909'},featureImage:{position:'absolute',right:0,top:0,bottom:0,width:'56%',height:'100%',opacity:.72},featureCopy:{width:'68%',padding:18,backgroundColor:'rgba(0,0,0,.58)'},featureTitle:{color:'#f1f1eb',fontSize:38,letterSpacing:3,fontWeight:'200',marginTop:22},featureBody:{color:'#b5b8b0',fontSize:12,lineHeight:19,marginTop:9},button:{borderWidth:StyleSheet.hairlineWidth,borderColor:'#c5c7c1',backgroundColor:'rgba(0,0,0,.62)',paddingHorizontal:14,minHeight:49,marginTop:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},buttonText:{color:'#f0f0e9',fontSize:10,letterSpacing:1.55,lineHeight:17,flexShrink:1},arrow:{color:'#e9e9e4',fontSize:19},
 sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:22,minHeight:44},smallLink:{minHeight:44,paddingLeft:16,justifyContent:'center'},linkText:{color:'#bbbdb6',fontSize:9,letterSpacing:1.4},exploreRow:{flexDirection:'row',gap:8},exploreTile:{flex:1,minHeight:108,backgroundColor:'#101617',overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:'#393e3c',borderRadius:3},exploreImage:{...StyleSheet.absoluteFillObject,opacity:.34},exploreCopy:{padding:10,marginTop:22},tileText:{color:'#babdb7',fontSize:10,lineHeight:15,marginTop:5},release:{paddingTop:28,marginTop:28,borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#333935'},releaseTitle:{color:'#e9ece5',fontSize:28,letterSpacing:1.5,fontWeight:'300',marginTop:12},
 ninaHeading:{paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},ready:{color:'#959e96',fontSize:9,letterSpacing:2,marginTop:7},about:{minWidth:68,minHeight:44,borderWidth:StyleSheet.hairlineWidth,borderColor:'#434944',alignItems:'center',justifyContent:'center'},portal:{borderWidth:StyleSheet.hairlineWidth,borderColor:'#444944',borderRadius:5,overflow:'hidden',backgroundColor:'#070909'},portalTop:{position:'absolute',top:16,left:16,right:16,flexDirection:'row',justifyContent:'space-between'},portalBottom:{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:22,paddingBottom:19,paddingTop:18,backgroundColor:'rgba(0,0,0,.75)'},portalCopy:{color:'#f1f2ec',fontSize:17,lineHeight:25,fontWeight:'300',textAlign:'center'},previewMic:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:22,marginTop:20},micIcon:{height:26,width:26,opacity:.75},idleLine:{height:1,width:38,backgroundColor:'#535b54'},previewLabel:{textAlign:'center',color:'#929c93',fontSize:8,letterSpacing:2,marginTop:10},links:{marginBottom:8},
 nav:{minHeight:70,backgroundColor:'#030404',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#333935',flexDirection:'row',paddingTop:10,paddingBottom:4},navItem:{flex:1,alignItems:'center',justifyContent:'center',minHeight:54},navIcon:{width:23,height:23,marginBottom:6},navInactive:{opacity:.58},navText:{fontSize:9,letterSpacing:1.2,color:'#9b9e97'},activeText:{color:'#f4f4ef'},navDot:{height:4,width:4,borderRadius:2,backgroundColor:'#f4f4ef',marginTop:7},invisible:{opacity:0},
});
