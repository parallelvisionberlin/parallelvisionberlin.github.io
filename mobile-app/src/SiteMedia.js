import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// Bundled website films. The VideoView is always rendered at full opacity.
// The poster is only a short startup/error layer, so a playing film can never remain hidden behind a static image.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film',contentFit='cover',contentPosition={dx:0,dy:0},posterStyle}){
  const [posterVisible,setPosterVisible]=useState(true);
  const [failed,setFailed]=useState(false);
  const [active,setActive]=useState(!AppState.currentState||AppState.currentState==='active');
  const shouldPlay=useRef(true);
  const revealTimer=useRef(null);
  const player=useVideoPlayer(source,p=>{
    p.muted=true;
    p.loop=true;
    p.audioMixingMode='mixWithOthers';
    p.timeUpdateEventInterval=.15;
    try{p.play();}catch{}
  });

  useEffect(()=>{
    shouldPlay.current=!paused&&active&&!failed;
    clearTimeout(revealTimer.current);
    try{
      if(shouldPlay.current){
        player.muted=true;
        player.play();
        // If iOS misses a render callback, do not leave a static poster covering a playing film.
        revealTimer.current=setTimeout(()=>setPosterVisible(false),900);
      }else{
        player.pause();
        if(paused)setPosterVisible(true);
      }
    }catch{setFailed(true);setPosterVisible(true);}
    return()=>clearTimeout(revealTimer.current);
  },[player,paused,active,failed]);

  useEffect(()=>{
    let mounted=true;
    const reveal=()=>{if(mounted) setPosterVisible(false);};
    const app=AppState.addEventListener('change',state=>setActive(state==='active'));
    const status=player.addListener('statusChange',event=>{
      if(!mounted)return;
      if(event.status==='error'){setFailed(true);setPosterVisible(true);return;}
      if(shouldPlay.current&&event.status==='readyToPlay'){
        try{player.muted=true;player.play();}catch{}
      }
    });
    const playing=player.addListener('playingChange',event=>{
      if(!mounted)return;
      if(shouldPlay.current&&event.isPlaying){clearTimeout(revealTimer.current);revealTimer.current=setTimeout(reveal,120);}
      else if(shouldPlay.current&&!event.isPlaying){try{player.play();}catch{}}
    });
    const time=player.addListener('timeUpdate',event=>{
      if(!mounted)return;
      const current=Number(event.currentTime??player.currentTime)||0;
      if(shouldPlay.current&&current>.03)reveal();
    });
    const watchdog=setInterval(()=>{
      if(!mounted||!shouldPlay.current)return;
      try{if(!player.playing)player.play();}catch{}
    },1000);
    return()=>{mounted=false;clearTimeout(revealTimer.current);clearInterval(watchdog);app.remove();status.remove();playing.remove();time.remove();};
  },[player]);

  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    {!failed&&<VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit={contentFit} contentPosition={contentPosition} nativeControls={false} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} onFirstFrameRender={()=>{setPosterVisible(false);try{if(shouldPlay.current)player.play();}catch{}}}/>} 
    {(posterVisible||failed)&&<Image pointerEvents="none" source={poster} style={[StyleSheet.absoluteFillObject,posterStyle]} resizeMode={contentFit}/>} 
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
