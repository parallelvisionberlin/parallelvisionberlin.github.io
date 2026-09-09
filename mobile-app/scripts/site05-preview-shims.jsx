import React,{useEffect,useMemo,useRef} from 'react';
import {View,StyleSheet} from 'react-native';
const getter=async()=> 'preview-fixture-token';
export const useAuth=()=>({isLoaded:true,isSignedIn:true,getToken:getter});
export const useUser=()=>({user:{firstName:'Test visitor',primaryEmailAddress:{emailAddress:'fixture@example.invalid'}}});
export const useClerk=()=>({signOut:async()=>{}});
export function useVideoPlayer(source,setup){return useMemo(()=>{const p={source,events:{},el:null,pending:false,play(){this.pending=true;this.el?.play().catch(()=>{});},pause(){this.pending=false;this.el?.pause();},addListener(name,handler){this.events[name]=handler;return{remove:()=>delete this.events[name]};}};setup(p);return p;},[source]);}
export function VideoView({player,style,onFirstFrameRender}){const ref=useRef(null);useEffect(()=>{player.el=ref.current;if(player.pending)player.play();return()=>{player.el=null;};},[player]);return <View style={style}><video ref={ref} src={player.source} muted loop playsInline onLoadedData={onFirstFrameRender} onError={()=>player.events.statusChange?.({status:'error'})} style={{width:'100%',height:'100%',objectFit:'cover'}}/></View>;}
export const WebView=React.forwardRef(({source,style,onLoadEnd},ref)=><View style={style}><iframe ref={ref} src={source.uri} title="Embedded content" onLoad={onLoadEnd} style={{width:'100%',height:'100%',border:0}}/></View>);
