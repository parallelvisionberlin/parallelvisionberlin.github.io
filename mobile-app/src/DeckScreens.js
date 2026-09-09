import React, { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { config } from './config';

const tabs = ['HOME', 'NINA', '2063', 'MUSIC', 'PROFILE'];
const icons = {
  HOME: require('../assets/deck04/home.png'),
  NINA: require('../assets/deck04/nina.png'),
  '2063': require('../assets/deck04/world.png'),
  MUSIC: require('../assets/deck04/music.png'),
  PROFILE: require('../assets/deck04/profile.png'),
};

const media = {
  cityVideo: `${config.siteUrl}/assets/optimized/video/2063/darkharmonyhero-mobile.mp4`,
  cityPoster: `${config.siteUrl}/assets/optimized/2063/POV%20DARK%20HARMONY.webp`,
  cityImage: `${config.siteUrl}/assets/optimized/thecitysuperhd1.webp`,
  ninaVideo: `${config.siteUrl}/assets/optimized/video/nina-fok/ninaloophero-mobile.mp4`,
  ninaPoster: `${config.siteUrl}/assets/optimized/nina-fok/HDNINACANON.webp`,
  stayLow: `${config.siteUrl}/assets/optimized/artworks/staylowart.webp`,
  fashion: `${config.siteUrl}/assets/optimized/fashion-hero.webp`,
};

const releases = [
  {title:'STAY LOW', artist:'MOLINARI × NINA FOK', url:'https://soundcloud.com/parallelvisionlabel/stay-low'},
  {title:'TANZEN IM KREIS', artist:'ALEJANDRO MOLINARI', url:'https://soundcloud.com/parallelvisionlabel/sets/alejandro-molinari-tanzen-im'},
  {title:'DARK ROCK EP', artist:'BLEX', url:'https://soundcloud.com/parallelvisionlabel/sets/dark-rock-ep'},
  {title:'BUILT TO LAST EP', artist:'REFRAKT', url:'https://soundcloud.com/parallelvisionlabel/sets/refrakt-ny-built-to-last-matt'},
];

function Label({children,style}){return <Text style={[s.label,style]}>{children}</Text>;}
function ThinButton({label,onPress}){return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[s.thinButton,pressed&&s.pressed]}><Text style={s.thinButtonText}>{label}</Text><Text style={s.arrow}>↗</Text></Pressable>;}
function VideoPanel({src,poster,height=420,objectPosition='50% 50%',overlay=true}){
  const html=useMemo(()=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#040404;overflow:hidden}video{width:100%;height:100%;object-fit:cover;object-position:${objectPosition};display:block}video::-webkit-media-controls,video::-webkit-media-controls-start-playback-button{display:none!important;-webkit-appearance:none}</style></head><body><video autoplay muted loop playsinline webkit-playsinline preload="auto" poster="${poster}" src="${src}"></video><script>var v=document.querySelector('video');v.muted=true;v.play().catch(function(){});document.addEventListener('visibilitychange',function(){document.hidden?v.pause():v.play().catch(function(){})});</script></body></html>`,[src,poster,objectPosition]);
  return <View style={[s.videoPanel,{height}]}><WebView source={{html,baseUrl:config.siteUrl}} style={s.webview} scrollEnabled={false} bounces={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false}/>{overlay&&<View pointerEvents="none" style={s.mediaShade}/>}</View>;
}

export function DeckHome({setTab,onTalk}){
  const {height}=useWindowDimensions();
  return <ScrollView showsVerticalScrollIndicator={false} style={s.screen} contentContainerStyle={s.homePage}>
    <View style={[s.heroWrap,{height:Math.max(520,Math.min(680,height*.72))}]}>
      <VideoPanel src={media.cityVideo} poster={media.cityPoster} height="100%"/>
      <View pointerEvents="none" style={s.heroTop}><Label>BERLIN / 2063</Label><Label>PARALLEL VISION</Label></View>
      <View pointerEvents="none" style={s.heroBottom}><Text style={s.heroTitle}>PARALLEL{`\n`}VISION</Text><Text style={s.heroCopy}>Music, moving image and possible futures from Berlin.</Text></View>
    </View>

    <View style={s.sectionBlock}>
      <View style={s.sectionRow}><Label>PROJECTS / CURRENT SIGNALS</Label><Label>01—03</Label></View>
      <Pressable onPress={()=>setTab('NINA')} style={s.projectCard}>
        <VideoPanel src={media.ninaVideo} poster={media.ninaPoster} height={330} objectPosition="50% 28%"/>
        <View style={s.projectOverlay}><Label>NINA FOK / LIVE SIGNAL</Label><Text style={s.projectTitle}>SHE'S IN BERLIN, 2063.</Text><Text style={s.projectCopy}>A live consciousness inside the Parallel Vision world.</Text><ThinButton label="ENTER NINA" onPress={onTalk}/></View>
      </Pressable>

      <Pressable onPress={()=>setTab('2063')} style={s.projectCard}>
        <Image source={{uri:media.cityImage}} style={s.projectImage} resizeMode="cover"/>
        <View pointerEvents="none" style={s.projectImageShade}/><View style={s.projectOverlay}><Label>BERLIN 2063 / WORLD</Label><Text style={s.projectTitle}>A POSSIBLE FUTURE.</Text><Text style={s.projectCopy}>City, people, fashion, transmissions and imagined systems.</Text></View>
      </Pressable>

      <Pressable onPress={()=>setTab('MUSIC')} style={s.projectCard}>
        <Image source={{uri:media.stayLow}} style={s.projectImage} resizeMode="cover"/>
        <View pointerEvents="none" style={s.projectImageShade}/><View style={s.projectOverlay}><Label>MUSIC / CURRENT RELEASE</Label><Text style={s.projectTitle}>STAY LOW</Text><Text style={s.projectCopy}>Molinari × Nina FOK</Text></View>
      </Pressable>
    </View>
  </ScrollView>;
}

export function DeckNina({onTalk,setTab}){
  const {height}=useWindowDimensions();
  return <ScrollView showsVerticalScrollIndicator={false} style={s.screen} contentContainerStyle={s.page}>
    <View style={s.sectionRow}><View><Label>NINA FOK / LIVE SIGNAL</Label><Text style={s.smallStatus}>AVAILABLE / BERLIN 2063</Text></View><Pressable onPress={()=>setTab('PROFILE')}><Label>YOUR ID ↗</Label></Pressable></View>
    <View style={[s.ninaRoom,{height:Math.max(520,Math.min(720,height*.74))}]}>
      <VideoPanel src={media.ninaVideo} poster={media.ninaPoster} height="100%" objectPosition="50% 30%"/>
      <View style={s.ninaRoomOverlay}><Text style={s.ninaLead}>She’s in Berlin, 2063.{`\n`}Speak with her live.</Text><ThinButton label="TALK TO NINA" onPress={onTalk}/></View>
    </View>
    <View style={s.infoStrip}><Label>CONTINUITY / MEMORY</Label><Text style={s.infoText}>Your Parallel Vision identity carries conversation context forward between visits.</Text></View>
  </ScrollView>;
}

export function Deck2063({setTab}){
  return <ScrollView showsVerticalScrollIndicator={false} style={s.screen} contentContainerStyle={s.page}>
    <Label>PARALLEL VISION / WORLD INDEX</Label><Text style={s.bigTitle}>BERLIN{`\n`}2063</Text><Text style={s.intro}>Not a timeline. An archive of signals from a possible future.</Text>
    <View style={s.worldHero}><Image source={{uri:media.cityImage}} style={StyleSheet.absoluteFillObject} resizeMode="cover"/><View style={s.projectImageShade}/><View style={s.worldCopy}><Label>THE CITY / 01</Label><Text style={s.worldTitle}>Berlin as remembered, rebuilt and imagined.</Text></View></View>
    {[['FASHION AFTER FABRIC','Bodies, material and identity beyond conventional clothing.'],['TRANSMISSIONS','Moving image, voices and fragments from the world.'],['PEOPLE','Artists and figures moving through Parallel Vision.']].map(([title,copy],i)=><View key={title} style={s.indexRow}><Label>0{i+2}</Label><View style={{flex:1}}><Text style={s.indexTitle}>{title}</Text><Text style={s.indexCopy}>{copy}</Text></View></View>)}
    <ThinButton label="OPEN NINA SIGNAL" onPress={()=>setTab('NINA')}/>
  </ScrollView>;
}

function SoundCloudPlayer({url}){
  const embed=`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23000000&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#050505}iframe{border:0;width:100%;height:116px;display:block;background:#050505}</style></head><body><iframe allow="autoplay; encrypted-media" src="${embed}"></iframe></body></html>`;
  return <WebView source={{html,baseUrl:config.siteUrl}} style={s.soundcloud} scrollEnabled={false} bounces={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}/>;
}

export function DeckMusic(){
  const [open,setOpen]=useState('STAY LOW');
  return <ScrollView showsVerticalScrollIndicator={false} style={s.screen} contentContainerStyle={s.page}>
    <Label>PARALLEL VISION / MUSIC</Label><Text style={s.bigTitle}>CURRENT{`\n`}SIGNALS</Text><Text style={s.intro}>Listen inside Parallel Vision. SoundCloud is the source, not the destination.</Text>
    {releases.map((r,i)=><View key={r.title} style={s.releaseBlock}><Pressable onPress={()=>setOpen(open===r.title?'':r.title)} style={s.releaseHeader}><Label>0{i+1}</Label><View style={{flex:1}}><Text style={s.releaseTitle}>{r.title}</Text><Text style={s.releaseArtist}>{r.artist}</Text></View><Text style={s.releaseToggle}>{open===r.title?'−':'+'}</Text></Pressable>{open===r.title&&<SoundCloudPlayer url={r.url}/>}</View>)}
  </ScrollView>;
}

export function DeckProfileMenu({children}){
  return <View style={s.profileShell}>
    {children}
    <View style={s.profileMenu}>
      {['PROFILE','SIGNAL CREDITS','REDEEM CODE','BILLING','MEMORY','NEWSLETTER'].map((item,i)=><View key={item} style={s.profileRow}><Label>{String(i+1).padStart(2,'0')}</Label><Text style={s.profileItem}>{item}</Text><Text style={s.profileArrow}>↗</Text></View>)}
    </View>
  </View>;
}

export function DeckNav({tab,onChange}){return <View accessibilityRole="tablist" style={s.nav}>{tabs.map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:item===tab}} onPress={()=>onChange(item)} key={item} style={s.navItem}><Image source={icons[item]} style={[s.navIcon,item!==tab&&s.navInactive]}/><Text style={[s.navText,item===tab&&s.activeText]}>{item}</Text><View style={[s.navDot,item!==tab&&s.invisible]}/></Pressable>)}</View>;}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#030404'},homePage:{paddingBottom:36},page:{paddingHorizontal:18,paddingTop:20,paddingBottom:40},label:{color:'#b6b8b2',fontSize:9,letterSpacing:1.8,lineHeight:15,fontWeight:'400'},pressed:{opacity:.68},arrow:{color:'#f1f1ed',fontSize:19},webview:{flex:1,backgroundColor:'#040404'},mediaShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.18)'},videoPanel:{overflow:'hidden',backgroundColor:'#050505'},
  heroWrap:{position:'relative',backgroundColor:'#050505'},heroTop:{position:'absolute',top:18,left:18,right:18,flexDirection:'row',justifyContent:'space-between'},heroBottom:{position:'absolute',left:22,right:22,bottom:28},heroTitle:{color:'#f2f2ee',fontSize:48,lineHeight:45,letterSpacing:2.8,fontWeight:'200'},heroCopy:{color:'#d6d7d1',fontSize:15,lineHeight:23,maxWidth:310,marginTop:18,fontWeight:'300'},
  sectionBlock:{paddingHorizontal:18,paddingTop:24},sectionRow:{minHeight:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},projectCard:{height:330,marginBottom:16,borderWidth:StyleSheet.hairlineWidth,borderColor:'#343a36',overflow:'hidden',backgroundColor:'#060707'},projectImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},projectImageShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.42)'},projectOverlay:{position:'absolute',left:0,right:0,bottom:0,padding:18,backgroundColor:'rgba(0,0,0,.62)'},projectTitle:{color:'#f0f1eb',fontSize:25,lineHeight:30,fontWeight:'300',letterSpacing:.2,marginTop:10},projectCopy:{color:'#b1b4ad',fontSize:12,lineHeight:18,marginTop:7,maxWidth:290},thinButton:{minHeight:50,marginTop:16,paddingHorizontal:14,borderWidth:StyleSheet.hairlineWidth,borderColor:'#c4c6bf',backgroundColor:'rgba(0,0,0,.45)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},thinButtonText:{color:'#f1f1ed',fontSize:10,letterSpacing:1.65,fontWeight:'500'},
  smallStatus:{color:'#7f877f',fontSize:8,letterSpacing:1.6,marginTop:5},ninaRoom:{position:'relative',borderWidth:StyleSheet.hairlineWidth,borderColor:'#3c423e',overflow:'hidden',backgroundColor:'#050505'},ninaRoomOverlay:{position:'absolute',left:0,right:0,bottom:0,padding:22,backgroundColor:'rgba(0,0,0,.7)'},ninaLead:{color:'#f0f1ec',fontSize:20,lineHeight:29,fontWeight:'300'},infoStrip:{paddingVertical:26,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#2f3431'},infoText:{color:'#969b95',fontSize:12,lineHeight:19,marginTop:10,maxWidth:330},
  bigTitle:{color:'#f2f2ee',fontSize:52,lineHeight:49,fontWeight:'200',letterSpacing:-1.7,marginTop:18},intro:{color:'#a9ada6',fontSize:15,lineHeight:23,marginTop:17,marginBottom:26,maxWidth:340},worldHero:{height:430,borderWidth:StyleSheet.hairlineWidth,borderColor:'#343a36',overflow:'hidden',marginBottom:12},worldCopy:{position:'absolute',left:18,right:18,bottom:18},worldTitle:{color:'#f2f2ee',fontSize:24,lineHeight:30,fontWeight:'300',marginTop:10,maxWidth:300},indexRow:{minHeight:116,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#303531',flexDirection:'row',gap:20,paddingVertical:22},indexTitle:{color:'#e8e9e4',fontSize:19,lineHeight:25,fontWeight:'300'},indexCopy:{color:'#8f958f',fontSize:12,lineHeight:18,marginTop:7},
  releaseBlock:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#323632'},releaseHeader:{minHeight:92,flexDirection:'row',alignItems:'center',gap:18},releaseTitle:{color:'#ecece7',fontSize:20,fontWeight:'300'},releaseArtist:{color:'#858b84',fontSize:9,letterSpacing:1.2,marginTop:7},releaseToggle:{color:'#aeb2ac',fontSize:24,fontWeight:'200'},soundcloud:{height:116,backgroundColor:'#050505',marginBottom:18},
  profileShell:{paddingBottom:26},profileMenu:{marginTop:26,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#343834'},profileRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#2b302c'},profileItem:{flex:1,color:'#e9e9e4',fontSize:14,letterSpacing:.8},profileArrow:{color:'#777d77',fontSize:16},
  nav:{minHeight:72,backgroundColor:'#030404',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#333935',flexDirection:'row',paddingTop:10,paddingBottom:4},navItem:{flex:1,alignItems:'center',justifyContent:'center',minHeight:54},navIcon:{width:23,height:23,marginBottom:6},navInactive:{opacity:.55},navText:{fontSize:9,letterSpacing:1.2,color:'#888d87'},activeText:{color:'#f4f4ef'},navDot:{height:4,width:4,borderRadius:2,backgroundColor:'#f4f4ef',marginTop:7},invisible:{opacity:0},
});