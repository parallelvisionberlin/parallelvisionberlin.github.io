import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// Bundled website films with their canonical poster always underneath.
// Playback is considered visible only after native timeUpdate confirms the film is moving.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film',contentFit='cover',videoStyle}){
  const [videoReady,setVideoReady]=useState(false);
  const [failed,setFailed]=useState(false);
  const [active,setActive]=useState(!AppState.currentState||AppState.currentState==='active');
  const [reduced,setReduced]=useState(false);
  const shouldPlay=useRef(true);
  const player=useVideoPlayer(source,p=>{
    p.muted=true;
    p.loop=true;
    p.audioMixingMode='mixWithOthers';
    p.timeUpdateEventInterval=.2;
  });

  useEffect(()=>{
    shouldPlay.current=!paused&&active&&!reduced&&!failed;
    try{
      if(shouldPlay.current){player.muted=true;player.play();}
      else player.pause();
    }catch{setFailed(true);setVideoReady(false);}
  },[player,paused,active,reduced,failed]);

  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(mounted)setReduced(v);}).catch(()=>{});
    const app=AppState.addEventListener('change',state=>setActive(state==='active'));
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
    const status=player.addListener('statusChange',event=>{
      if(event.status==='error'){setFailed(true);setVideoReady(false);return;}
      if(shouldPlay.current&&(event.status==='readyToPlay'||event.status==='ready')){
        try{player.muted=true;player.play();}catch{}
      }
    });
    const time=player.addListener('timeUpdate',event=>{
      const current=Number(event.currentTime??player.currentTime)||0;
      if(shouldPlay.current&&current>.04)setVideoReady(true);
    });
    return()=>{mounted=false;app.remove();motion.remove();status.remove();time.remove();};
  },[player]);

  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    <Image pointerEvents="none" source={poster} style={StyleSheet.absoluteFillObject} resizeMode={contentFit}/>
    {!reduced&&!failed&&<VideoView player={player} style={[StyleSheet.absoluteFillObject,videoStyle,{opacity:videoReady?1:0}]} contentFit={contentFit} nativeControls={false} allowsPictureInPicture={false} onFirstFrameRender={()=>{try{if((Number(player.currentTime)||0)>.01)setVideoReady(true);}catch{}}}/>} 
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
