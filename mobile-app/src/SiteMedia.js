import React, {useEffect,useState} from 'react';
import {AccessibilityInfo,AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// Original website films and posters, bundled. No HTML video or microphone access.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film'}) {
  const [firstFrame,setFirstFrame]=useState(false);
  const [failed,setFailed]=useState(false);
  // Native startup can briefly have an unknown state; only a known inactive state pauses.
  const [active,setActive]=useState(!AppState.currentState||AppState.currentState==='active');
  const [reduced,setReduced]=useState(false);
  const player=useVideoPlayer(source,p=>{p.muted=true;p.loop=true;p.audioMixingMode='mixWithOthers';});
  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(mounted)setReduced(v);}).catch(()=>{});
    const a=AppState.addEventListener('change',state=>setActive(state==='active'));
    const r=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
    const e=player.addListener('statusChange',event=>{if(event.status==='error'){setFailed(true);setFirstFrame(false);}});
    return()=>{mounted=false;a.remove();r.remove();e.remove();};
  },[player]);
  useEffect(()=>{
    try {if(paused||!active||reduced||failed)player.pause();else{player.muted=true;player.play();}}
    catch{setFailed(true);setFirstFrame(false);}
  },[player,paused,active,reduced,failed]);
  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false}
      allowsPictureInPicture={false} onFirstFrameRender={()=>setFirstFrame(true)}/>
    {(!firstFrame||failed||reduced)&&<Image pointerEvents="none" source={poster} style={StyleSheet.absoluteFillObject} resizeMode="cover"/>}
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
