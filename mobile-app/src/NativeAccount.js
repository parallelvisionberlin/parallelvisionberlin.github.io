import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,Pressable,Share,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {useAuth,useClerk,useUser} from '@clerk/expo';
import {accountRequest,accountSections,formatTime,formatDate,SITE_ORIGIN} from './site05Model';

function Button({title,onPress,busy=false,disabled=false,danger=false}){return <Pressable testID={title} accessibilityRole="button" accessibilityState={{disabled:busy||disabled}} disabled={busy||disabled} onPress={onPress} style={({pressed})=>[s.button,pressed&&s.pressed,(busy||disabled)&&s.disabled]}>{busy?<ActivityIndicator color="#ddd"/>:<Text style={[s.buttonText,danger&&s.danger]}>{title}</Text>}</Pressable>;}
function Field({label,value,onChangeText,...props}){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} style={s.input} placeholderTextColor="#777" {...props}/></View>;}
function Money({amount,currency}){let text='';try{text=new Intl.NumberFormat('en',{style:'currency',currency:currency||'EUR'}).format(Number(amount));}catch{text=String(amount)+' '+(currency||'EUR');}return <Text style={s.copy}>{text}</Text>;}

export function NativeAccount({onContinue,opening=false}){
  const {getToken}=useAuth();const {user}=useUser();const {signOut}=useClerk();
  const getter=useRef(getToken);getter.current=getToken;
  const alive=useRef(true),epoch=useRef(0),busyRef=useRef(false);
  const [section,setSection]=useState('');const [account,setAccount]=useState(null);
  const [credits,setCredits]=useState(null),[history,setHistory]=useState([]),[billing,setBilling]=useState([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [name,setName]=useState(''),[language,setLanguage]=useState('en'),[code,setCode]=useState('');
  const [updates,setUpdates]=useState(false),[ninaUpdates,setNinaUpdates]=useState(false);
  const request=useCallback((path,options)=>accountRequest(options=>getter.current(options),path,options),[]);
  const load=useCallback(async()=>{
    const id=++epoch.current;setLoading(true);setError('');
    try{
      const a=await request('/api/account');
      if(!alive.current||id!==epoch.current)return;
      setAccount(a);setName(a.preferences?.preferredName||a.displayName||'');setLanguage(a.preferences?.language==='de'?'de':'en');
      setUpdates(a.preferences?.newsletterUpdates===true);setNinaUpdates(a.preferences?.ninaTransmissions===true);
      if(section==='credits'){
        const [c,h]=await Promise.all([request('/api/nina/credits'),request('/api/nina/credits/history?limit=8')]);
        if(alive.current&&id===epoch.current){setCredits(c);setHistory(h.transactions||[]);}
      }
      if(section==='billing'){const b=await request('/api/account/billing?limit=12');if(alive.current&&id===epoch.current)setBilling(b.purchases||[]);}
    }catch(e){if(alive.current&&id===epoch.current)setError(e.message||'Unable to load your account.');}
    finally{if(alive.current&&id===epoch.current)setLoading(false);}
  },[section,request]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;};},[]);
  useEffect(()=>{setNotice('');setError('');void load();return()=>{epoch.current++;};},[load]);
  // Do not refetch on every foreground event: it would erase an unsaved form.
  const run=async(work,success)=>{
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{await work();if(alive.current)setNotice(success||'');}
    catch(e){if(alive.current)setError(e.message||'The action could not finish. Please retry.');}
    finally{busyRef.current=false;if(alive.current)setBusy(false);}
  };
  const navigate=id=>{if(!busyRef.current){setSection(id);setCredits(null);setHistory([]);setBilling([]);}};
  const forget=()=>Alert.alert('Forget Nina’s memory?','This permanently deletes this account’s conversation and relationship memory. Your profile, credits and purchases remain.',[{text:'Cancel',style:'cancel'},{text:'Delete memory',style:'destructive',onPress:()=>run(()=>request('/memory',{method:'DELETE',body:{}}),'Nina’s stored memory was deleted.')}]);
  const logOut=()=>Alert.alert('Sign out?','Your saved conversations and credits stay in your account.',[{text:'Cancel',style:'cancel'},{text:'Sign out',onPress:()=>run(()=>signOut())}]);
  const shareInvite=()=>run(async()=>{
    let u;try{u=new URL(account?.referral_link);}catch{throw new Error('Your invitation link is not available yet.');}
    if(u.origin!==SITE_ORIGIN)throw new Error('Your invitation link is not available yet.');
    await Share.share({message:`Meet Nina in Berlin, 2063. ${u.href}`,url:u.href});
  });
  const title=accountSections.find(item=>item.id===section)?.title||'Your account';
  const signedName=account?.preferences?.preferredName||account?.displayName||user?.firstName||'Parallel Vision';
  const canEdit=!!account&&!loading;
  return <View testID="native-account">
    {section?<Pressable testID="account-back" accessibilityRole="button" disabled={busy} onPress={()=>navigate('')} style={s.back}><Text style={s.label}>‹ ACCOUNT MENU</Text></Pressable>:<><Text style={s.label}>PARALLEL VISION ID</Text><Text style={s.name}>{signedName}</Text><Text style={s.copy}>{user?.primaryEmailAddress?.emailAddress||''}</Text></>}
    {!!section&&<Text style={s.title}>{title}</Text>}
    {loading&&<View style={s.loading}><ActivityIndicator color="#ddd"/><Text style={s.copy}>Loading account…</Text></View>}
    {!!error&&<View accessibilityRole="alert" style={s.message}><Text style={s.error}>{error}</Text><Button title="RETRY" onPress={()=>void load()} busy={busy}/></View>}
    {!!notice&&<Text accessibilityRole="alert" style={s.message}>{notice}</Text>}
    {!section&&<><Button title={opening?'OPENING NINA':'TALK TO NINA'} onPress={onContinue} busy={opening}/><View style={s.menu}>{accountSections.map((item,i)=><Pressable testID={'account-'+item.id} key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={()=>navigate(item.id)} style={s.menuRow}><Text style={s.index}>0{i+1}</Text><Text style={s.menuText}>{item.title}</Text><Text style={s.arrow}>›</Text></Pressable>)}</View><Button title="SIGN OUT" onPress={logOut} busy={busy}/></>}
    {section==='profile'&&<><Text style={s.copy}>Your preferred name and language. These are separate from Nina’s conversational memory.</Text><Field label="PREFERRED NAME" value={name} onChangeText={setName} editable={canEdit&&!busy} maxLength={120} autoCorrect={false}/><Text style={s.label}>LANGUAGE</Text><View style={s.language}>{[['en','English'],['de','Deutsch']].map(([value,label])=><Pressable accessibilityRole="button" accessibilityState={{selected:language===value}} disabled={!canEdit||busy} onPress={()=>setLanguage(value)} key={value} style={[s.languageButton,language===value&&s.selected]}><Text style={s.buttonText}>{label}</Text></Pressable>)}</View><Button title="SAVE PROFILE" disabled={!canEdit} busy={busy} onPress={()=>run(()=>request('/api/account/profile',{method:'PUT',body:{preferredName:name.trim(),language}}),'Profile saved.')}/></>}
    {section==='credits'&&<><Text style={s.creditNumber}>{account?.role==='owner'?'Unmetered':credits?.balance!=null?String(credits.balance):'…'}</Text><Text style={s.copy}>{account?.role==='owner'?'Owner signal':credits?formatTime(credits.remainingSeconds)+' with Nina':'Your real balance will appear when loaded.'}</Text><Button title="REDEEM A CODE" onPress={()=>navigate('redeem')}/><Button title="TALK TO NINA" onPress={onContinue} busy={opening}/><Text style={s.subhead}>RECENT ACTIVITY</Text>{!loading&&!error&&!history.length&&<Text style={s.copy}>No credit transactions yet.</Text>}{history.map((t,i)=><View key={t.id||i} style={s.record}><Text style={s.recordTitle}>{Number(t.amount)>0?'+':''}{t.amount} credits</Text><Text style={s.copy}>{t.source==='anam_session'?'Live Nina / ':''}{formatDate(t.createdAt)}</Text></View>)}</>}
    {section==='redeem'&&<><Text style={s.copy}>Redeem an access code into this signed-in account.</Text><Field label="ACCESS CODE" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={160} editable={!busy}/><Button title="REDEEM CODE" disabled={!code.trim()||!canEdit} busy={busy} onPress={()=>run(async()=>{const result=await request('/api/nina/credits/redeem',{method:'POST',body:{code:code.trim()}});setCode('');setCredits(result);},'Code redeemed. Open Signal Credits to see the updated balance.')}/></>}
    {section==='billing'&&<><Text style={s.copy}>Purchase records for this account. Opening this page does not create a purchase.</Text>{!loading&&!error&&!billing.length&&<Text style={s.empty}>No purchases yet.</Text>}{billing.map((p,i)=><View key={p.id||i} style={s.record}><Text style={s.recordTitle}>{p.credits} Signal Credits</Text><Money amount={p.amount} currency={p.currency}/><Text style={s.copy}>{({paid:'Completed',open:'Not completed',failed:'Failed',expired:'Expired'})[p.status]||'Not completed'} / {formatDate(p.paidAt||p.createdAt)}</Text></View>)}</>}
    {section==='memory'&&<><Text style={s.copy}>Nina uses saved conversation context and relationship memory when you return. Forgetting it cannot be undone.</Text><Text style={s.copy}>Your preferred name, credits and purchases are not deleted.</Text><Button title="FORGET NINA’S MEMORY" disabled={!canEdit} busy={busy} danger onPress={forget}/></>}
    {section==='newsletter'&&<><Text style={s.copy}>Choose which updates you would like to receive. These settings save your preferences; they do not confirm that email delivery is active.</Text><View style={s.toggle}><Text style={s.menuText}>Parallel Vision updates</Text><Switch accessibilityLabel="Parallel Vision updates" value={updates} onValueChange={setUpdates} disabled={!canEdit||busy}/></View><View style={s.toggle}><Text style={s.menuText}>Nina transmissions</Text><Switch accessibilityLabel="Nina transmissions" value={ninaUpdates} onValueChange={setNinaUpdates} disabled={!canEdit||busy}/></View><Button title="SAVE PREFERENCES" disabled={!canEdit} busy={busy} onPress={()=>run(()=>request('/api/account/preferences',{method:'PUT',body:{newsletterUpdates:updates,ninaTransmissions:ninaUpdates}}),'Preferences saved.')}/></>}
    {section==='referral'&&<><Text style={s.copy}>Share your invite link. When a referred friend purchases 100 or more Signal Credits, you receive 100 Signal Credits.</Text><Text selectable style={s.invite}>{account?.referral_link||'Invite link unavailable.'}</Text><Button title="SHARE INVITE" disabled={!canEdit||!account?.referral_link} busy={busy} onPress={shareInvite}/></>}
  </View>;
}
const s=StyleSheet.create({label:{color:'#aaa69d',fontSize:9,letterSpacing:1.65,lineHeight:16},name:{color:'#f2eee5',fontSize:32,fontWeight:'300',marginTop:15},title:{color:'#f2eee5',fontSize:30,fontWeight:'300',marginTop:8,marginBottom:15},copy:{color:'#b0aca3',fontSize:13,lineHeight:21,marginTop:9},back:{minHeight:44,justifyContent:'center'},button:{minHeight:50,marginTop:18,paddingHorizontal:15,paddingVertical:12,borderWidth:StyleSheet.hairlineWidth,borderColor:'#757169',justifyContent:'center',alignItems:'center'},buttonText:{color:'#eee9e0',fontSize:11,letterSpacing:1.4,lineHeight:18},disabled:{opacity:.45},pressed:{opacity:.65},danger:{color:'#d9aaa0'},menu:{marginTop:25,borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#35322e'},menuRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:15,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#35322e'},index:{color:'#726c64',fontSize:9},menuText:{flex:1,color:'#ddd7cb',fontSize:14,lineHeight:21},arrow:{color:'#aaa397',fontSize:23},loading:{flexDirection:'row',gap:12,alignItems:'center',marginVertical:12},message:{color:'#c0ceba',fontSize:13,lineHeight:21,marginVertical:16},error:{color:'#d9aaa0',fontSize:13,lineHeight:21},field:{marginTop:24,marginBottom:22},input:{minHeight:49,paddingHorizontal:13,paddingVertical:12,marginTop:9,color:'#f1ede5',fontSize:16,borderWidth:1,borderColor:'#49453d'},language:{flexDirection:'row',gap:12,marginTop:10},languageButton:{flex:1,minHeight:46,borderWidth:1,borderColor:'#39352f',justifyContent:'center',alignItems:'center'},selected:{borderColor:'#cac1b2'},creditNumber:{color:'#eee9df',fontSize:40,fontWeight:'200',marginTop:14},subhead:{color:'#aaa396',fontSize:10,letterSpacing:1.5,marginTop:28},record:{paddingVertical:16,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#35322e'},recordTitle:{color:'#e2ddd3',fontSize:16},toggle:{flexDirection:'row',alignItems:'center',gap:18,minHeight:62,marginTop:14},empty:{color:'#898276',fontSize:15,marginTop:25},invite:{color:'#b9b4a8',fontSize:13,lineHeight:21,marginTop:24}});
