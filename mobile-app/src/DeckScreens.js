import React,{useState} from 'react';
import {ActivityIndicator,Alert,Image,Linking,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {WebView} from 'react-native-webview';
import {SiteFilm} from './SiteMedia';
import {siteAssets as media} from './site05Assets';
import {projects,releases,soundCloudEmbed} from './site05Model';
const tabs=['HOME','NINA','2063','MUSIC','PROFILE'];
const icons={HOME:require('../assets/deck04/home.png'),NINA:require('../assets/deck04/nina.png'),'2063':require('../assets/deck04/world.png'),MUSIC:require('../assets/deck04/music.png'),PROFILE:require('../assets/deck04/profile.png')};
export function Label({children,style}){return <Text style={[s.label,style]}>{children}</Text>;}
export function ThinButton({label,onPress,disabled=false}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,pressed&&s.pressed,disabled&&s.disabled]}><Text style={s.buttonText}>{label}</Text><Text style={s.arrow}>↗</Text></Pressable>;}
function ImageProject({image,title,label,copy,onPress}){return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({pressed})=>[s.project,pressed&&s.pressed]}><Image source={image} style={StyleSheet.absoluteFillObject} resizeMode="cover"/><View style={s.projectCaption}><Label>{label}</Label><View style={s.row}><Text style={s.projectTitle}>{title}</Text><Text style={s.arrow}>↗</Text></View><Text style={s.copy}>{copy}</Text></View></Pressable>;}
export function DeckHome({setTab,paused=false}){
  const {height,width}=useWindowDimensions();const heroHeight=Math.max(360,Math.min(630,height-225));
  return <ScrollView testID="home-screen" style={s.screen} contentContainerStyle={s.homePage} showsVerticalScrollIndicator={false}>
    <View style={{height:heroHeight}}><SiteFilm source={media.cityVideo} poster={media.cityPoster} paused={paused} style={StyleSheet.absoluteFillObject} label="Berlin 2063 motorbike and city film"/>
      <View pointerEvents="none" style={s.heroTop}><Label>BERLIN / 2063</Label><Label>PARALLEL VISION</Label></View>
      <View pointerEvents="none" style={s.heroCopy}><Text style={[s.heroTitle,{fontSize:Math.min(48,width*.125)}]}>PARALLEL{'\n'}VISION</Text><Text style={s.heroDescription}>Music, moving image and possible futures from Berlin.</Text></View>
    </View>
    <View style={s.page}><View style={s.sectionRow}><Label>PROJECTS / CURRENT SIGNALS</Label><Label>01 / 03</Label></View>
      <ImageProject image={media.ninaPoster} title="NINA FOK" label="LIVE SIGNAL / BERLIN 2063" copy="She’s in Berlin, 2063. Speak with her live." onPress={()=>setTab('NINA')}/>
      <ImageProject image={media.city} title="BERLIN 2063" label="THE WORLD" copy="City, fashion and moving transmissions." onPress={()=>setTab('2063')}/>
      <ImageProject image={media.stayLow} title="STAY LOW" label="MUSIC / CURRENT RELEASE" copy="Molinari × Nina FOK" onPress={()=>setTab('MUSIC')}/>
    </View>
  </ScrollView>;
}
export function DeckNina({onTalk,busy=false,paused=false,onRead}){
  const {height}=useWindowDimensions();const roomHeight=Math.max(380,Math.min(650,height-245));
  return <ScrollView testID="nina-screen" style={s.screen} contentContainerStyle={s.homePage} showsVerticalScrollIndicator={false}>
    <View style={[s.sectionRow,s.horizontal]}><Label>NINA FOK / LIVE SIGNAL</Label><Label>BERLIN / 2063</Label></View>
    <View style={{height:roomHeight}}><SiteFilm source={media.ninaVideo} poster={media.ninaPoster} paused={paused} style={StyleSheet.absoluteFillObject} label="Nina’s original room animation from the website"/>
      <View style={s.ninaCopy}><Text style={s.ninaTitle}>NINA FOK</Text><Text style={s.heroDescription}>She’s in Berlin, 2063. Speak with her live.</Text><ThinButton label={busy?'OPENING SIGNAL':'TALK TO NINA'} onPress={onTalk} disabled={busy}/></View>
    </View>
    <View style={s.page}><ThinButton label="DISCOVER THE PROJECT" onPress={()=>onRead({title:'NINA FOK',path:'/nina-project.html'})}/><View style={s.note}><Label>CONTINUITY / MEMORY</Label><Text style={s.copy}>Your Parallel Vision account carries your conversation history between visits.</Text></View></View>
  </ScrollView>;
}
export function Deck2063({onRead}){
  return <ScrollView testID="world-screen" style={s.screen} contentContainerStyle={s.homePage} showsVerticalScrollIndicator={false}>
    <View style={s.worldHero}><Image source={media.city} style={StyleSheet.absoluteFillObject} resizeMode="cover"/><View style={s.heroCopy}><Label>PARALLEL VISION / WORLD</Label><Text style={s.heroTitle}>BERLIN{'\n'}2063</Text></View></View>
    <View style={s.page}><Text style={s.intro}>An archive of signals from a possible future.</Text>{projects.map((p,i)=><Pressable key={p.id} testID={'project-'+p.id} accessibilityRole="button" accessibilityLabel={p.title} onPress={()=>onRead(p)} style={({pressed})=>[s.projectRow,pressed&&s.pressed]}><Image source={media[p.image]} style={s.projectThumb}/><View style={{flex:1}}><Label>0{i+1}</Label><Text style={s.rowTitle}>{p.title}</Text><Text style={s.copy}>{p.copy}</Text></View><Text style={s.arrow}>↗</Text></Pressable>)}</View>
  </ScrollView>;
}
export function SoundCloudPlayer({release}){
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  const embed=soundCloudEmbed(release);
  const external=url=>{try{const u=new URL(url);if(u.protocol!=='https:')return;Alert.alert('Open SoundCloud?', 'Playback can stay here. Open the external page only if you choose.',[{text:'Stay here',style:'cancel'},{text:'Open',onPress:()=>Linking.openURL(url).catch(()=>setError('The external link could not open.'))}]);}catch{}};
  return <View style={[s.player,{height:release.playlist?350:190}]}>
    <WebView key={attempt} testID="soundcloud-player" source={{uri:embed}} style={s.playerWeb} originWhitelist={['https://*']} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false}
      onLoadStart={()=>setLoading(true)} onLoadEnd={()=>setLoading(false)} onError={()=>{setLoading(false);setError('Player unavailable. Check your connection and retry.');}}
      onOpenWindow={e=>external(e.nativeEvent.targetUrl)}
      onShouldStartLoadWithRequest={r=>{try{const u=new URL(r.url);if(r.url==='about:blank'||(u.origin==='https://w.soundcloud.com'&&u.pathname.startsWith('/player')))return true;if(r.isTopFrame===false)return u.protocol==='https:';external(r.url);}catch{}return false;}}/>
    {loading&&<View pointerEvents="none" style={s.playerLoading}><ActivityIndicator color="#ddd"/><Text style={s.copy}>Opening player…</Text></View>}
    {!!error&&<View style={s.playerError}><Text style={s.copy}>{error}</Text><ThinButton label="RETRY PLAYER" onPress={()=>{setError('');setLoading(true);setAttempt(v=>v+1);}}/></View>}
  </View>;
}
export function DeckMusic(){
  const [open,setOpen]=useState('');
  return <ScrollView testID="music-screen" style={s.screen} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
    <Label>PARALLEL VISION / MUSIC</Label><Text style={s.pageTitle}>CURRENT{'\n'}SIGNALS</Text><Text style={s.intro}>Listen here, inside Parallel Vision.</Text>
    {releases.map((r,i)=><View key={r.id} style={s.release}><Pressable testID={'release-'+r.id} accessibilityRole="button" accessibilityState={{expanded:open===r.id}} accessibilityLabel={'Listen to '+r.title} onPress={()=>setOpen(open===r.id?'':r.id)} style={s.releaseHead}><Label>0{i+1}</Label><View style={{flex:1}}><Text style={s.rowTitle}>{r.title}</Text><Label style={{marginTop:7}}>{r.artist}</Label></View><Text style={s.arrow}>{open===r.id?'−':'▷'}</Text></Pressable>{open===r.id&&<><Text style={s.playerHint}>SOUNDCLOUD / Tap play in the player if it does not start automatically.</Text><SoundCloudPlayer release={r}/></>}</View>)}
  </ScrollView>;
}
export function DeckNav({tab,onChange}){return <View accessibilityRole="tablist" style={s.nav}>{tabs.map(item=><Pressable accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{selected:item===tab}} onPress={()=>onChange(item)} key={item} style={s.navItem}><Image source={icons[item]} style={[s.navIcon,item!==tab&&s.navInactive]}/><Text style={[s.navText,item===tab&&s.activeText]}>{item}</Text><View style={[s.navDot,item!==tab&&s.invisible]}/></Pressable>)}</View>;}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#060606'},homePage:{paddingBottom:20},page:{paddingHorizontal:18,paddingTop:24,paddingBottom:32},horizontal:{paddingHorizontal:18},label:{color:'#b3b2ab',fontSize:9,letterSpacing:1.65,lineHeight:15},copy:{color:'#bab8b0',fontSize:12,lineHeight:19,marginTop:8},intro:{color:'#bdbbb3',fontSize:15,lineHeight:23,marginTop:16,marginBottom:24},pressed:{opacity:.72},disabled:{opacity:.55},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{color:'#eee',fontSize:22},heroTop:{position:'absolute',left:18,right:18,top:18,flexDirection:'row',justifyContent:'space-between'},heroCopy:{position:'absolute',bottom:0,left:0,right:0,padding:22,paddingTop:16,backgroundColor:'rgba(0,0,0,.48)'},heroTitle:{color:'#f3f1eb',fontSize:48,lineHeight:49,fontWeight:'200',letterSpacing:1.2},heroDescription:{color:'#e6e3db',fontSize:14,lineHeight:22,marginTop:12,maxWidth:310},sectionRow:{minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},project:{height:310,marginBottom:20,overflow:'hidden',backgroundColor:'#111',borderWidth:StyleSheet.hairlineWidth,borderColor:'#36332f'},projectCaption:{position:'absolute',left:0,right:0,bottom:0,padding:18,backgroundColor:'rgba(0,0,0,.70)'},projectTitle:{flex:1,color:'#f1eee7',fontSize:28,fontWeight:'300',marginTop:7},ninaCopy:{position:'absolute',left:0,right:0,bottom:0,padding:22,backgroundColor:'rgba(0,0,0,.62)'},ninaTitle:{fontSize:40,fontWeight:'200',letterSpacing:1,color:'#f4f1ea'},button:{minHeight:52,paddingHorizontal:16,marginTop:18,borderWidth:1,borderColor:'#9d9b94',backgroundColor:'rgba(0,0,0,.6)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},buttonText:{flex:1,color:'#eeece5',fontSize:11,letterSpacing:1.5,lineHeight:18},note:{marginTop:28,paddingTop:22,borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#35322f'},worldHero:{height:350,backgroundColor:'#111'},pageTitle:{color:'#f3f1eb',fontSize:42,lineHeight:44,fontWeight:'200',marginTop:16},projectRow:{paddingVertical:18,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#333',flexDirection:'row',alignItems:'center',gap:13,minHeight:120},projectThumb:{width:66,height:90},rowTitle:{color:'#eeeae2',fontSize:18,lineHeight:24,fontWeight:'300'},release:{borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#333'},releaseHead:{minHeight:96,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:15},player:{position:'relative',marginBottom:20,backgroundColor:'#161616'},playerWeb:{flex:1,backgroundColor:'#161616'},playerLoading:{position:'absolute',right:10,top:8,flexDirection:'row',gap:10,alignItems:'center'},playerError:{...StyleSheet.absoluteFillObject,padding:20,backgroundColor:'#111'},playerHint:{color:'#93918b',fontSize:10,lineHeight:16,marginBottom:10},nav:{minHeight:70,backgroundColor:'#070707',borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#34322f',flexDirection:'row',paddingTop:9,paddingBottom:4},navItem:{flex:1,alignItems:'center',justifyContent:'center',minHeight:54},navIcon:{width:22,height:22,marginBottom:6},navInactive:{opacity:.55},navText:{fontSize:9,letterSpacing:1.1,color:'#929089'},activeText:{color:'#eeeae2'},navDot:{height:3,width:3,borderRadius:2,backgroundColor:'#eee',marginTop:6},invisible:{opacity:0}});
