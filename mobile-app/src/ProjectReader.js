import React,{useRef,useState} from 'react';
import {ActivityIndicator,Alert,Linking,Modal,Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {trustedProjectURL,SITE_ORIGIN} from './site05Model';

// Public project pages only. Never receives, stores or injects an account token.
export function ProjectReader({project,onClose}){
  const web=useRef(null);const [back,setBack]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const url=trustedProjectURL(project.path);
  const external=value=>{try{const u=new URL(value);if(u.protocol!=='https:')return;Alert.alert('Open external page?',u.hostname,[{text:'Cancel',style:'cancel'},{text:'Open',onPress:()=>Linking.openURL(u.href).catch(()=>setError('This link could not open.'))}]);}catch{}};
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={s.shell}><View style={s.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={back?'Previous project page':'Back to app'} style={s.control} onPress={()=>back?web.current?.goBack():onClose()}><Text style={s.text}>‹ BACK</Text></Pressable>
      <Text numberOfLines={1} style={s.title}>{project.title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close project" style={s.control} onPress={onClose}><Text style={s.text}>CLOSE</Text></Pressable>
    </View>
    <View style={s.body}>{!!url&&<WebView ref={web} source={{uri:url}} style={s.body} allowsInlineMediaPlayback
      setSupportMultipleWindows={false} onOpenWindow={e=>external(e.nativeEvent.targetUrl)}
      onNavigationStateChange={v=>setBack(v.canGoBack)} onLoadStart={()=>{setLoading(true);setError('');}} onLoadEnd={()=>setLoading(false)}
      onError={()=>{setLoading(false);setError('This project could not load. Check your connection.');}}
      onHttpError={e=>{if(e.nativeEvent.statusCode>=400&&e.nativeEvent.url===url){setLoading(false);setError('This project is temporarily unavailable.');}}}
      onShouldStartLoadWithRequest={r=>{if(r.url==='about:blank'||trustedProjectURL(r.url))return true;if(r.isTopFrame===false)return r.url.startsWith('https://');external(r.url);return false;}}
      injectedJavaScript={`(function(){if(location.origin!==${JSON.stringify(SITE_ORIGIN)})return;var s=document.createElement('style');s.textContent='body>nav,.site-nav,.nav-main{display:none!important}';document.head.appendChild(s);})();true;`}/>} 
      {loading&&<View pointerEvents="none" style={s.loading}><ActivityIndicator color="#ddd"/></View>}
      {!!error&&<View style={s.error}><Text style={s.copy}>{error}</Text><Pressable accessibilityRole="button" style={s.control} onPress={()=>{setError('');web.current?.reload();}}><Text style={s.text}>TRY AGAIN</Text></Pressable></View>}
    </View></SafeAreaView>
  </Modal>;
}
const s=StyleSheet.create({shell:{flex:1,backgroundColor:'#070707'},bar:{minHeight:52,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#252525'},body:{flex:1,backgroundColor:'#070707'},control:{minHeight:48,paddingHorizontal:16,justifyContent:'center'},text:{color:'#ddd',fontSize:10,letterSpacing:1},title:{flex:1,color:'#aaa',fontSize:10,letterSpacing:1},loading:{position:'absolute',top:18,right:18},error:{...StyleSheet.absoluteFillObject,padding:30,justifyContent:'center',backgroundColor:'#090909'},copy:{color:'#ccc',fontSize:15,lineHeight:23}});
