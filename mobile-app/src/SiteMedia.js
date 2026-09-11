import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// Bundled website films. These are core editorial motion, so they play whenever the app is active.
// The canonical poster stays underneath until iOS has actually rendered/started the native video.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film',contentFit='cover',contentPosition={dx:0,dy:0},posterStyle}){
  const [videoReady,setVideoReady]=useState(false);
  const [failed,setFailed]=useState(false);
  const [active,setActive]=useState(!AppState.currentState||AppState.currentState==='active');
  const shouldPlay=useRef(true);
  const player=useVideoPlayer(source,p=>{
    p.muted=true;
    p.loop=true;
    p.audioMixingMode='mixWithOthers';
    p.timeUpdateEventInterval=.2;
    try{p.play();}catch{}
  });

  useEffect(()=>{
    shouldPlay.current=!paused&&active&&!failed;
    try{
      if(shouldPlay.current){player.muted=true;player.play();}
      else player.pause();
    }catch{setFailed(true);setVideoReady(false);}
  },[player,paused,active,failed]);

  useEffect(()=>{
    let mounted=true;
    const app=AppState.addEventListener('change',state=>setActive(state==='active'));
    const status=player.addListener('statusChange',event=>{
      if(!mounted)return;
      if(event.status==='error'){setFailed(true);setVideoReady(false);return;}
      if(shouldPlay.current&&(event.status==='readyToPlay'||event.status==='ready')){
        try{player.muted=true;player.play();}catch{}
      }
    });
    const playing=player.addListener('playingChange',event=>{
      if(!mounted)return;
      if(shouldPlay.current&&event.isPlaying)setVideoReady(true);
      else if(shouldPlay.current&&!event.isPlaying){try{player.play();}catch{}}
    });
    const time=player.addListener('timeUpdate',event=>{
      if(!mounted)return;
      const current=Number(event.currentTime??player.currentTime)||0;
      if(shouldPlay.current&&current>.02)setVideoReady(true);
    });
    const watchdog=setInterval(()=>{
      if(!mounted||!shouldPlay.current)return;
      try{if(!player.playing)player.play();}catch{}
    },1200);
    return()=>{mounted=false;clearInterval(watchdog);app.remove();status.remove();playing.remove();time.remove();};
  },[player]);

  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    <Image pointerEvents="none" source={poster} style={[StyleSheet.absoluteFillObject,posterStyle]} resizeMode={contentFit}/>
    {!failed&&<VideoView player={player} style={[StyleSheet.absoluteFillObject,{opacity:videoReady?1:0}]} contentFit={contentFit} contentPosition={contentPosition} nativeControls={false} allowsPictureInPicture={false} onFirstFrameRender={()=>{setVideoReady(true);try{if(shouldPlay.current)player.play();}catch{}}}/>} 
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
