from pathlib import Path
import subprocess

for name, expected in {
 'lab/precision-edit.js':'a4f26f460c4de2db9566dfa1f342f384fd08d0a6',
 'lab-worker/precision-edit.mjs':'0cd8855a59ec004931fae0780fb8920928b91e44',
 'lab/image-viewer-editor.js':'a33652f02ba63bfdfe123fc1b743e0414499c627',
 'lab/viewer-selection-scope.js':'94d635d94298ba7331a559a5d5f5f205bb2f6d45'
}.items():
 assert subprocess.check_output(['git','hash-object',name],text=True).strip()==expected, 'Source changed: '+name

def once(s,a,b):
 assert s.count(a)==1,'Expected one source match: '+a[:110]
 return s.replace(a,b)
def save(path,s):Path(path).write_text(s)

p='lab/precision-edit.js';s=Path(p).read_text()
s=once(s,"import {SAM_CANDIDATE_LIMIT,SAM_CLICK_MISS,samClickCandidate,preferSamCandidate} from './sam-click-mask.js?v=20261108-click1';", "import {SAM_CANDIDATE_LIMIT,SAM_CLICK_MISS,samClickCandidate,preferSamCandidate,samForegroundCandidate,samBackgroundCandidate} from './sam-click-mask.js?v=20261108-regions1';\nimport {createSelectionFeedback} from './selection-feedback.js?v=20261108-regions1';")
s=once(s,"  const undoStack=[],maxUndo=12,finalizing=new Map();", "  const feedback=createSelectionFeedback({holder:$('precision-source-holder'),stage:$('precision-stage')});\n  const undoStack=[],maxUndo=12,finalizing=new Map();")
s=once(s,"    selectionTargetPrompt=['face','person','clothing'].includes(target)?target:'';", "    selectionTargetPrompt=['face','person','clothing','background','protect-object'].includes(target)?target:'';\n    view.dispatchEvent(new Event('precision-selection-target-change'));")
s=once(s,"  function close(){\n    view.hidden=true;", "  function close(){\n    feedback.clear();\n    view.hidden=true;")
s=once(s,"    selectionMetricsCache=undefined;editEpoch++;maskCtx.clearRect(0,0,mask.width,mask.height);", "    feedback.clear();selectionMetricsCache=undefined;editEpoch++;maskCtx.clearRect(0,0,mask.width,mask.height);")
s=once(s,"    return samClickCandidate(pixels.data,canvas.width,canvas.height,point,{scope:target});", "    return target==='background'?samForegroundCandidate(pixels.data,canvas.width,canvas.height,{scope:'person'}):samClickCandidate(pixels.data,canvas.width,canvas.height,point,{scope:target});")
s=once(s,"  function applySamCandidate(candidate){", "  function applySamCandidate(candidate,operation='add'){")
s=once(s,"    saveUndo();maskCtx.drawImage(canvas,0,0);maskChanged();", "    saveUndo();\n    if(operation==='background')maskCtx.clearRect(0,0,mask.width,mask.height);\n    maskCtx.save();maskCtx.globalCompositeOperation=operation==='protect-object'?'destination-out':'source-over';\n    maskCtx.drawImage(canvas,0,0);maskCtx.restore();maskChanged();")
start=s.index('  async function magicSelect(point){');end=s.index('  function maskExport(){',start)
s=s[:start]+'''  async function magicSelect(point){
    if(!base||taskBusy)return;
    if(!magicReady()){setStatus('Magic Select is unavailable on this account. Use the Brush instead.',true);return;}
    const target=selectionTargetPrompt,background=target==='background',protecting=target==='protect-object';
    if(protecting&&!selected){setStatus('Select the background first, then choose an object to keep.',true);return;}
    const semantic=background?'person':protecting?'':target;
    const candidateMasks=['face','person','clothing'].includes(semantic);
    taskBusy=true;
    feedback.start({point,width:mask.width,height:mask.height,message:background?'Selecting background · protecting people…':protecting?'Protecting object…':'Selecting…'});
    refreshButtons();$('precision-source-holder').classList.add('is-busy');
    view.dispatchEvent(new CustomEvent('precision-selection-busy',{detail:{busy:true}}));
    const revision=++session;let changed=false;
    try{
      const sourceId=await ensureBaseId();
      setStatus(background?'Finding all people to protect…':'Selecting your subject…');
      const p=point?{x:Math.min(base.width-1,Math.round(point.x*base.width/mask.width)),y:Math.min(base.height-1,Math.round(point.y*base.height/mask.height))}:null;
      const reply=await api('/api/precision/segment',{method:'POST',body:{sourceId,...(background?{selectBackground:true}:{point:p}),...(semantic?{targetPrompt:semantic}:{}),...(candidateMasks?{candidateMasks:true}:{})}});
      if(!reply?.requestId||!reply.ticket)throw new Error('Segmentation did not return a request ID.');
      if(background&&reply.candidateMasks!==true)throw Error('Whole-background selection is not available on this server yet. Your selection is unchanged.');
      let ready=null;
      for(let attempt=0;attempt<65&&revision===session;attempt++){
        if(attempt)await sleep(1700);
        const qs=new URLSearchParams({sourceId,requestId:reply.requestId,expires:String(reply.expires),ticket:reply.ticket});
        if(reply.candidateMasks===true)qs.set('candidateMasks','1');
        const result=await api('/api/precision/segment?'+qs.toString());
        if(result?.status==='completed'){ready=result;break;}
      }
      if(revision!==session)throw new Error('The source photograph changed.');
      if(!ready?.maskSourceId)throw new Error('Automatic selection is still processing. Do not submit another request yet.');
      const ids=Array.isArray(ready.maskSourceIds)?ready.maskSourceIds:[ready.maskSourceId];
      if(!ids.length||ids.length>SAM_CANDIDATE_LIMIT||ids.some(id=>typeof id!=='string'||!id))throw Error('Invalid automatic selection candidates.');
      if(background&&ids.length>=SAM_CANDIDATE_LIMIT)throw Error('Too many people to protect automatically. Your selection is unchanged. Use Brush.');
      let best=null;const people=[];
      for(const id of new Set(ids)){
        if(revision!==session||!base)throw Error('The source photograph changed.');
        const blob=await assetBlob(id),bitmap=await createImageBitmap(blob);
        try{
          if(revision!==session||!base)throw Error('The source photograph changed.');
          const candidate=readSamCandidate(bitmap,point,target);
          if(background)people.push(candidate);else best=preferSamCandidate(best,candidate);
        }finally{bitmap.close();}
      }
      if(revision!==session||!base)throw Error('The source photograph changed.');
      if(background)best=samBackgroundCandidate(people);
      if(!best)throw Error(SAM_CLICK_MISS);
      applySamCandidate(best,background?'background':protecting?'protect-object':'add');changed=true;
      feedback.clear();
      setStatus(background?'Background selected. Review that every person is protected; use Keep object for props.':protecting?'Object protected. Only the remaining purple area can change.':view.classList.contains('is-guided-replace')?'Selection ready. Choose a replacement or describe it.':'Object selected. Refine with the brush.');
    }catch(e){
      if(/Magic Select limit reached/.test(e.message))selectMode('brush');
      if(isOpen())feedback.error(/did not match/.test(e.message)?'Selection did not match your click. Use Brush.':'Selection could not finish. See the message in the panel.');
      setStatus(e.message,true);
    }finally{
      taskBusy=false;$('precision-source-holder').classList.remove('is-busy');refreshButtons();
      view.dispatchEvent(new CustomEvent('precision-selection-busy',{detail:{busy:false,changed}}));
    }
  }
  function selectBackground(){
    if(!base||taskBusy)return;
    setSelectionTarget('background');selectMode('magic');return magicSelect(null);
  }
''' +s[end:]
s=once(s,'return {open,close,isOpen,selectionMetrics,setSelectionTarget,clearSelection:', 'return {open,close,isOpen,selectionMetrics,setSelectionTarget,getSelectionTarget:()=>selectionTargetPrompt,selectBackground,clearSelection:')
save(p,s)

p='lab-worker/precision-edit.mjs';s=Path(p).read_text()
s=once(s,"    if(candidateMasks&&(!point||!['face','person'].includes(targetPrompt)))d.fail(400,'Candidate selection requires a clicked face or person.');", "    const selectBackground=data.selectBackground===true;\n    if(selectBackground&&(!candidateMasks||targetPrompt!=='person'||point))d.fail(400,'Background selection requires separate people masks.');\n    if(candidateMasks&&((!point&&!selectBackground)||!['face','person','clothing'].includes(targetPrompt)))d.fail(400,'Candidate selection requires a clicked subject or explicit background action.');")
s=once(s,'// Character mode retrieves separate masks; the client matches the actual click.','// Semantic modes return separate masks; the client matches the click or\n      // explicitly protects all people before composing a background selection.')
save(p,s)

p='lab/viewer-selection-scope.js';s=Path(p).read_text()
s=once(s,"  return ''; // Object and background keep point selection, not ambiguous text prompts.","  if(kind==='location')return 'background';\n  return ''; // Object uses the actual point without a guessed detection index.")
s=once(s,"  return 'Select the background to replace, keeping people outside the purple area.';", "  return 'Click to select the whole background. Review that people stay protected.';")
save(p,s)

p='lab/image-viewer-editor.js';s=Path(p).read_text()
s=once(s,"./viewer-selection-scope.js?v=20261107-scope1","./viewer-selection-scope.js?v=20261108-regions1")
s=once(s,"  locationNote.textContent='Select the background to change, or select the people to keep and invert the selection. Saved location references are not supported by the current server; describe the new setting below.';", "  locationNote.textContent='Select the whole background, then review that all people are protected. Use Keep object for props. Saved location references are not yet supported; describe the new setting below.';")
s=once(s,"invert.textContent='Select background instead'", "invert.textContent='Select whole background'")
s=once(s,"  invert.addEventListener('click',()=>{if(!submitting&&!editor.isBusy())editor.invertSelection?.();});", "  invert.addEventListener('click',()=>{if(!submitting&&!editor.isBusy())void editor.selectBackground?.();});\n  const keepObject=document.createElement('button');keepObject.type='button';keepObject.className='viewer-invert';keepObject.textContent='Keep object';keepObject.hidden=true;keepObject.setAttribute('aria-pressed','false');\n  keepObject.addEventListener('click',()=>{if(submitting||editor.isBusy()||!editor.hasSelection())return;const protect=editor.getSelectionTarget?.()!=='protect-object';editor.setSelectionTarget(protect?'protect-object':'background');editor.setMode('magic');status.textContent=protect?'Click an object to keep unchanged.':'Click the photo to select the whole background again.';refresh();});")
s=once(s,'directionLabel.after(kinds,characterModes,selectionAdvice,library,selectedCard,locationNote,invert);','directionLabel.after(kinds,characterModes,selectionAdvice,library,selectedCard,locationNote,invert,keepObject);')
s=once(s,'generate.hidden=!reference;', 'generate.hidden=!reference&&!loadingReference;')
s=once(s,"    guide.hidden=!isReplace()||chosen||!helpOpen;guide.classList.toggle('is-compact',learned);", "    const protecting=isReplace()&&scope.value==='location'&&editor.getSelectionTarget?.()==='protect-object';\n    guide.hidden=!isReplace()||(chosen&&!protecting)||!helpOpen||editor.isBusy();guide.classList.toggle('is-compact',learned||protecting);")
s=once(s,"    guide.querySelector('strong').textContent=scopeInstruction(scope.value,characterScope,mode==='brush');", "    guide.querySelector('strong').textContent=protecting?'Click an object to keep unchanged.':scopeInstruction(scope.value,characterScope,mode==='brush');")
s=once(s,"    locationNote.hidden=invert.hidden=!isReplace()||scope.value!=='location';invert.disabled=!chosen||submitting||editor.isBusy();", "    locationNote.hidden=invert.hidden=keepObject.hidden=!isReplace()||scope.value!=='location';invert.disabled=submitting||editor.isBusy();\n    keepObject.disabled=!chosen||submitting||editor.isBusy();keepObject.setAttribute('aria-pressed',String(protecting));\n    selectedCard.setAttribute('aria-busy',String(loadingReference));")
s=once(s,"    generate.textContent=submitting?'Generating…':quote?'Generate · '+quote.label:'Generate';", "    generate.textContent=submitting?'Generating…':loadingReference?'Loading references…':quoting?'Checking price…':quote?'Generate · '+quote.label:'Generate';")
s=once(s,"  workspace.addEventListener('precision-selection-change',invalidate);", "  workspace.addEventListener('precision-selection-change',invalidate);\n  workspace.addEventListener('precision-selection-target-change',refresh);\n  workspace.addEventListener('precision-selection-busy',event=>{refresh();if(event.detail?.changed&&!editor.isBusy())invalidate();});")
s=once(s,'invert.hidden=characterModes.hidden=selectionAdvice.hidden=true;', 'invert.hidden=keepObject.hidden=characterModes.hidden=selectionAdvice.hidden=true;')
save(p,s)

p='lab/selection-feedback.js';s=Path(p).read_text();s=once(s,'font:550 12px/1.4 inherit;','font-family:inherit;font-weight:550;font-size:12px;line-height:1.4;');save(p,s)
p='lab/lab.js';s=Path(p).read_text();s=once(s,'./precision-edit.js?v=20261108-click1','./precision-edit.js?v=20261108-regions1');s=once(s,'./image-viewer-editor.js?v=20261108-loading-safety1','./image-viewer-editor.js?v=20261108-regions1');save(p,s)
p='lab/studio.html';s=Path(p).read_text();s=once(s,'&clickSelection=20261108-click1','&clickSelection=20261108-click1&selectionRegions=20261108-regions1');save(p,s)

p='tests/lab-viewer-scope.test.mjs';s=Path(p).read_text();s=once(s,"assert.equal(selectionTarget('location'),'');","assert.equal(selectionTarget('location'),'background');");save(p,s)
p='tests/lab-sam-click-mask.test.mjs';s=Path(p).read_text()
s=once(s,"for(const targetPrompt of ['face','person'])", "for(const targetPrompt of ['face','person','clothing'])")
s=once(s,'assert.equal(h.submitted,2);assert.equal(h.reserved,2);', 'assert.equal(h.submitted,3);assert.equal(h.reserved,3);')
s=once(s,"targetPrompt:'clothing',candidateMasks:true}),e=>e.status===400)","targetPrompt:'object',candidateMasks:true}),e=>e.status===400)")
s=s.replace("test('Face and person make exactly one bounded candidate request", "test('Face, person and clothing make exactly one bounded candidate request")
s=s.replace("test('Outfit and Object retain their exact existing single-mask requests'", "test('Legacy Outfit and Object retain their existing single-mask request compatibility'")
s+='''
import './lab-selection-regions.test.mjs';
test('explicit whole-background action requests all people once without a guessed click',async()=>{
 const h=harness();try{
  const q=await(await h.route({sourceId,targetPrompt:'person',candidateMasks:true,selectBackground:true})).json();
  const body=JSON.parse(h.calls.at(-1).options.body);
  assert.equal(body.prompt,'person');assert.deepEqual(body.point_prompts,[]);assert.equal(body.max_masks,8);
  assert.equal(q.candidateMasks,true);assert.equal(h.reserved,1);assert.equal(h.submitted,1);
  const masks=await(await h.poll(q)).json();assert.equal(masks.maskSourceIds.length,2);
  await assert.rejects(h.route({sourceId,targetPrompt:'clothing',candidateMasks:true,selectBackground:true}),e=>e.status===400);
  assert.equal(h.submitted,1,'Invalid background scopes never buy another request');
 }finally{h.restore();}
});
''';save(p,s)
p='tests/lab-sam-click-mask-ui.mjs';s=Path(p).read_text();s+="\nawait import('./lab-selection-regions-ui.mjs');\n";save(p,s)
print('Scoped changes applied. Layout, generation providers, billing, and customer records are unchanged.')
