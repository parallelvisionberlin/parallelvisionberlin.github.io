import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import Module,{createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const mocks={
 'react-native':`export const ActivityIndicator='ActivityIndicator',KeyboardAvoidingView='KeyboardAvoidingView',Modal='Modal',Pressable='Pressable',SafeAreaView='SafeAreaView',ScrollView='ScrollView',StatusBar='StatusBar',Text='Text',View='View';export const Platform={OS:'ios'},StyleSheet={create:x=>x,hairlineWidth:1,absoluteFillObject:{}},AppState={addEventListener:()=>({remove(){}})},BackHandler={addEventListener:()=>({remove(){}})},Linking={openURL:async()=>{}},Alert={alert(){}};`,
 '@clerk/expo':`export const ClerkProvider=({children})=>children;export const useAuth=()=>globalThis.__pvAuth;export const useClerk=()=>({signOut:async()=>{}});export const useUser=()=>({user:{firstName:'Test'}});`,
 '@clerk/expo/token-cache':`export const tokenCache={};`,
 'react-native-webview':`import React,{forwardRef,useImperativeHandle} from 'react';export const WebView=forwardRef((props,ref)=>{useImperativeHandle(ref,()=>({injectJavaScript:s=>globalThis.__pvScripts.push(s)}));return React.createElement('WebView',props);});`,
 'expo-file-system/legacy':`export const cacheDirectory='/tmp/',EncodingType={Base64:'base64'},writeAsStringAsync=async()=>{},deleteAsync=async()=>{};`,
 'expo-sharing':`export const isAvailableAsync=async()=>true,shareAsync=async()=>{};`,
 './AuthPanel':`export const AuthPanel=()=>null;`,
 './config':`export const config={clerkPublishableKey:'test'};`
};
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/LabApp.js',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',loader:{'.js':'jsx'},external:['react'],plugins:[{name:'native-fixtures',setup(b){b.onResolve({filter:/.*/},args=>args.path in mocks?{path:args.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx'}));}}]});
const filename=fileURLToPath(new URL('./lab-app-fixture.cjs',import.meta.url));
const module=new Module(filename);module.paths=Module._nodeModulePaths(fileURLToPath(new URL('..',import.meta.url)));module.require=require;module._compile(bundle.outputFiles[0].text,filename);
const App=module.exports.default;
test('four-tab app starts in public Moods and preserves photo selection through sign-in',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__pvScripts=[];
 globalThis.__pvAuth={isLoaded:true,isSignedIn:false,userId:null,sessionId:null,getToken:async()=>''};
 let renderer;
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(App));});
  const root=renderer.root;
  const tabs=()=>root.findAllByType('Pressable').filter(n=>n.props.accessibilityRole==='tab');
  assert.deepEqual(tabs().map(n=>n.props.accessibilityLabel),['Gallery','Moods','Create','Profile']);
  assert.equal(tabs().find(n=>n.props.accessibilityLabel==='Moods').props.accessibilityState.selected,true);
  assert.equal(root.findAllByType('WebView').length,1);
  const discover=root.findByType('WebView');assert.match(discover.props.source.uri,/app-moods.html/);
  const url='https://parallelvisionlabel.com/lab/studio.html?mood=night-flash&handoff=20000000-0000-4000-8000-000000000001';
  await act(async()=>{assert.equal(discover.props.onShouldStartLoadWithRequest({url,isTopFrame:true}),false);});
  assert.equal(root.findByType('Modal').props.visible,true);
  assert.equal(root.findAllByType('WebView').length,1,'Sign-in retains the guest photo page');
  globalThis.__pvAuth={isLoaded:true,isSignedIn:true,userId:'user_Test',sessionId:'sess_Test',getToken:async()=>'test'};
  await act(async()=>{renderer.update(React.createElement(App));});
  assert.equal(root.findByType('Modal').props.visible,false);
  assert.equal(tabs().find(n=>n.props.accessibilityLabel==='Create').props.accessibilityState.selected,true);
  const studio=root.findAllByType('WebView').find(n=>n.props.source.uri.includes('studio.html'));
  await act(async()=>{studio.props.onLoadStart();});
  await act(async()=>{await studio.props.onMessage({nativeEvent:{url:studio.props.source.uri,data:JSON.stringify({type:'PV_LAB_READY'})}});});
  assert.ok(globalThis.__pvScripts.some(s=>s.includes('night-flash')&&s.includes('20000000-0000-4000-8000-000000000001')));
  await act(async()=>tabs()[0].props.onPress());
  assert.ok(globalThis.__pvScripts.at(-1).includes('gallery'));
  await act(async()=>tabs()[3].props.onPress());
  assert.equal(tabs()[3].props.accessibilityState.selected,true);
  assert.equal(root.findAllByType('WebView').length,2,'Switching tabs preserves both pages');
 }finally{if(renderer)await act(async()=>renderer.unmount());delete globalThis.__pvAuth;delete globalThis.__pvScripts;}
});
