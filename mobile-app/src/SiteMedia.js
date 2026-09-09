import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// Bundled website films with a persistent canonical poster underneath.
// We only reveal video after playback time is actually advancing, avoiding a black hero after first-frame callbacks.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film',contentFit='cover'}){
  const [videoReady,setVideoReady]=useState(false);
  const [failed,setFailed]=useState(false);
  const [active,setActive]=useState(!AppState.currentState||AppState.currentState==='active');
  const [reduced,setReduced]=useState(false);
  const lastTime=useRef(0),stalled=useRef(0);
  const player=useVideoPlayer(source,p=>{p.muted=true;p.loop=true;p.audioMixingMode='mixWithOthers';});

  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(mounted)setReduced(v);}).catch(()=>{});
    const a=AppState.addEventListener('change',state=>setActive(state==='active'));
    const r=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
    const e=player.addListener('statusChange',event=>{if(event.status==='error'){setFailed(true);setVideoReady(false);}});
    return()=>{mounted=false;a.remove();r.remove();e.remove();};
  },[player]);

  useEffect(()=>{
    if(paused||!active||reduced||failed){try{player.pause();}catch{};setVideoReady(false);return;}
    try{player.muted=true;player.play();}catch{setFailed(true);setVideoReady(false);return;}
    lastTime.current=Number(player.currentTime)||0;stalled.current=0;
    const timer=setInterval(()=>{
      const now=Number(player.currentTime)||0;
      if(now>lastTime.current+.03){stalled.current=0;setVideoReady(true);}
      else if(++stalled.current>=3){setVideoReady(false);try{player.play();}catch{}}
      lastTime.current=now;
    },500);
    return()=>clearInterval(timer);
  },[player,paused,active,reduced,failed]);

  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    <Image pointerEvents="none" source={poster} style={StyleSheet.absoluteFillObject} resizeMode={contentFit}/>
    {!reduced&&!failed&&<VideoView player={player} style={[StyleSheet.absoluteFillObject,{opacity:videoReady?1:0}]} contentFit={contentFit} nativeControls={false} allowsPictureInPicture={false}/>} 
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
