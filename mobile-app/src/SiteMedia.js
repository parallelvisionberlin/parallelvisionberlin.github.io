import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// The bundled website films are already composed around their subjects.
// Keep the native video visible and centered; the poster is only a short startup/error layer.
export function SiteFilm({source,poster,paused=false,style,label='Parallel Vision film',contentFit='cover',posterStyle}){
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
        // Do not let a missed iOS render callback leave the static poster over a playing film.
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
    const reveal=()=>{if(mounted)setPosterVisible(false);};
    const app=AppState.addEventListener('change',state=>setActive(state==='active'));
    const status=player.addListener('statusChange',event=>{
      if(!mounted)return;
      if(event.status==='error'){setFailed(true);setPosterVisible(true);return;}
      if(shouldPlay.current&&(event.status==='readyToPlay'||event.status==='ready')){
        try{player.muted=true;player.play();}catch{}
      }
    });
    const playing=player.addListener('playingChange',event=>{
      if(!mounted)return;
      if(shouldPlay.current&&event.isPlaying){
        clearTimeout(revealTimer.current);
        revealTimer.current=setTimeout(reveal,120);
      }else if(shouldPlay.current&&!event.isPlaying){
        try{player.play();}catch{}
      }
    });
    const time=player.addListener('timeUpdate',event=>{
      if(!mounted)return;
      const current=Number(event.currentTime??player.currentTime)||0;
      if(shouldPlay.current&&current>.03)reveal();
    });
    return()=>{
      mounted=false;
      clearTimeout(revealTimer.current);
      app.remove();status.remove();playing.remove();time.remove();
    };
  },[player]);

  return <View style={[s.frame,style]} accessible accessibilityLabel={label}>
    {!failed&&<VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit={contentFit} contentPosition={{dx:0,dy:0}} nativeControls={false} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} onFirstFrameRender={()=>{setPosterVisible(false);try{if(shouldPlay.current)player.play();}catch{}}}/>} 
    {(posterVisible||failed)&&<Image pointerEvents="none" source={poster} style={[StyleSheet.absoluteFillObject,posterStyle]} resizeMode={contentFit}/>} 
  </View>;
}
const s=StyleSheet.create({frame:{overflow:'hidden',backgroundColor:'#090909'}});
