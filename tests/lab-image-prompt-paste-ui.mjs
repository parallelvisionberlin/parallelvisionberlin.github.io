// Mock-only browser check: no Clerk login, generation or provider requests.
// Exercises the production Studio styles and the actual prompt sizing/input handlers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.ok(process.env.PV_PLAYWRIGHT_MODULE,'Playwright module is required');
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const sizingStart=source.indexOf('function fitImageComposerPrompt(){');
const sizingEnd=source.indexOf('\nfunction syncImageComposer(){',sizingStart);
assert.ok(sizingStart>0&&sizingEnd>sizingStart);
const handlerStart=source.indexOf("$('image-composer-prompt').addEventListener('input',");
const handlerEnd=source.indexOf('\nfor(const [copy,real]',handlerStart);
assert.ok(handlerStart>0&&handlerEnd>handlerStart);
const sizing=source.slice(sizingStart,sizingEnd);
const handler=source.slice(handlerStart,handlerEnd);
assert.match(handler,/inputType==='insertFromPaste'/);
assert.match(html,/image-composer-stable\.css\?v=\d{8}-[a-z0-9-]+/);
const stable=readFileSync('lab/image-composer-stable.css','utf8');
assert.match(stable,/font-size:15\.5px!important/);
assert.doesNotMatch(stable,/height:54px!important;min-height:54px!important/);
assert.match(stable,/grid-template-rows:minmax\(64px,max-content\) 41px!important/);

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+p);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  if(p==='/lab/lab.js'||p==='/lab/gallery-layout.js'){res.end('export {};');return;}
  res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const longPrompt=Array.from({length:52},(_,i)=>
  'Frame '+(i+1)+': faithful photographic detail, composition, skin texture, soft lighting and material precision.'
).join('\n');
const checks=[];
try{
  for(const viewport of [{width:1440,height:900},{width:1100,height:700},{width:390,height:844},{width:390,height:600}]){
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    try{
      await page.route('https://**/*',route=>route.abort());
      await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        document.body.classList.remove('lab-booting');
        document.body.classList.add('lab-ready');
        const app=document.getElementById('app');
        app.hidden=false;
        app.classList.add('image-studio-active');
        document.getElementById('image-studio').hidden=false;
        document.getElementById('image-composer').classList.add('is-seedream');
        document.getElementById('image-composer-references').hidden=true;
      });
      await page.addScriptTag({content:
        "const $=id=>document.getElementById(id);const busy=false;const imageComposer=$('image-composer');const committedElementMentions=[];function updateElementSuggestions(){}function effectiveImagePrompt(){return '';}" +
        sizing+'\n'+handler+
        "\n$('prompt').addEventListener('input',fitImageComposerPrompt);fitImageComposerPrompt();"
      });
      // Measure the visible count stepper, including the phone's open More row.
      const countLayout=await page.evaluate(()=>{
        const composer=document.getElementById('image-composer');
        const mobile=matchMedia('(max-width:899px)').matches;
        const settings=composer.dataset.mobileSettings;
        if(mobile)composer.dataset.mobileSettings='open';
        const rect=id=>{
          const element=document.getElementById(id),r=element.getBoundingClientRect();
          const style=getComputedStyle(element);
          return {left:r.left,right:r.right,width:r.width,height:r.height,
            display:style.display,border:style.borderTopWidth,background:style.backgroundColor,fontSize:style.fontSize};
        };
        const layout={
          deck:rect('image-composer'),
          generate:rect('image-composer-generate'),
          select:rect('image-composer-count'),
          wrap:rect('image-composer-count-wrap'),
          minus:rect('image-composer-count-decrease'),
          plus:rect('image-composer-count-increase'),
          status:rect('image-composer-count-status')
        };
        if(mobile){
          if(settings===undefined)delete composer.dataset.mobileSettings;
          else composer.dataset.mobileSettings=settings;
        }
        return layout;
      });
      const {wrap,deck}=countLayout;
      assert.equal(countLayout.select.display,'none','The original select stays hidden on web');
      assert.equal(wrap.height,32,'The count stepper uses the reference height');
      assert.equal(wrap.border,'0px','The count stepper has no outline border');
      assert.equal(wrap.background,'rgb(50, 52, 55)','The count stepper uses the reference charcoal');
      assert.equal(countLayout.status.fontSize,'14px','The count stays readable');
      if(viewport.width>=1180){
        assert.equal(wrap.width,98,'The desktop count stepper uses the reference width');
        assert.ok(wrap.right<=countLayout.generate.left,'The count stepper clears Generate');
      }
      assert.ok(wrap.left>=deck.left&&wrap.right<=deck.right,
        'Count stays inside the Image Deck: '+JSON.stringify(countLayout));
      for(const part of ['minus','status','plus']){
        const item=countLayout[part];
        assert.ok(item.width>0&&item.left>=wrap.left&&item.right<=wrap.right,
          part+' stays inside the count stepper: '+JSON.stringify(countLayout));
      }
      const editor=page.locator('#image-composer-prompt');
      // The sizing helper must never replace the contextual copy already
      // chosen by syncImageComposer() for a selected Base photograph.
      await editor.evaluate(el=>{
        el.placeholder='What would you like to change?';
        fitImageComposerPrompt();
      });
      assert.equal(await editor.getAttribute('placeholder'),'What would you like to change?',
        'Prompt height measurement must preserve approved Base-image placeholder');
      const empty=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
      assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
        'The empty Image deck must start compact');
      // This fixture has no visible welcome panel, so it is the locked
      // History presentation, independent of the card-view focus behavior.
      await editor.focus();
      assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
        'An empty signed-in prompt stays compact when focused');
      await editor.fill('A quiet Berlin street portrait.');
      assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
        'A one-line prompt should not expand an editor that already fits it');
      await editor.fill('');
      await editor.evaluate((el,text)=>{
        el.focus({preventScroll:true});
        el.value=text;
        el.setSelectionRange(text.length,text.length);
        el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:text}));
      },longPrompt);
      // Wait for the actual deck height transition before sampling the completed layout.
      await page.waitForFunction(()=>{
        const h=document.getElementById('image-composer-prompt').getBoundingClientRect().height;
        return h>=(innerWidth>899?125:95);
      },null,{timeout:2500});
      // Pasted-at-end scrolling occurs on the next animation frame. Await
      // that frame before asserting the final scroll position.
      await page.waitForFunction(()=>{
        const field=document.getElementById('image-composer-prompt');
        return field.scrollHeight>field.clientHeight+140 &&
          field.scrollTop>=field.scrollHeight-field.clientHeight-3;
      },null,{timeout:2500});
      const result=await page.evaluate(()=>{
        const rect=selector=>{
          const r=document.querySelector(selector).getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
        };
        const editor=document.getElementById('image-composer-prompt');
        return {
          composer:rect('#image-composer'),field:rect('#image-composer-prompt'),
          generate:rect('#image-composer-generate'),controls:rect('.composer-controls'),
          viewport:{w:innerWidth,h:innerHeight},
          scrollTop:editor.scrollTop,scrollMax:editor.scrollHeight-editor.clientHeight,
          overflow:getComputedStyle(editor).overflowY,
          value:editor.value,fontSize:parseFloat(getComputedStyle(editor).fontSize),docWidth:document.documentElement.scrollWidth
        };
      });
      assert.equal(result.value,longPrompt,'Pasted text is preserved');
      // The later editorial deck (promptType=20261106-13px-compact1) supersedes
      // image-composer-stable.css's older 15.5px desktop typography.
      if(viewport.width>=900)assert.equal(result.fontSize,13,'Desktop Image prompt uses the requested smaller 13px type');
      else if(viewport.width>=741)assert.equal(result.fontSize,15.5,'Tablet Image prompt retains the existing 15.5px type');
      else assert.equal(result.fontSize,16,'Phone prompt uses readable text to avoid iOS focus zoom');
      assert.equal(result.overflow,'auto','Long prompt scrolls in its own field');
      assert.ok(result.scrollMax>140,'The input must contain hidden text beyond the visible area');
      assert.ok(result.scrollTop>=result.scrollMax-3,'Pasting at end shows the final lines');
      assert.ok(result.field.height>= (viewport.width>899?125:95),'Prompt expands beyond one strip: '+JSON.stringify(result));
      assert.ok(result.field.height<= (viewport.width>899?138:124),'Prompt remains bounded');
      assert.ok(result.composer.height>empty+(viewport.width>899?70:40),'Composer grows only when needed');
      assert.ok(result.composer.height<Math.min(viewport.height-40,410),'Composer cannot cover the gallery');
      assert.ok(result.composer.top>=0&&result.composer.bottom<=viewport.height+2,'Composer stays in view');
      assert.ok(result.generate.top>=result.composer.top&&result.generate.bottom<=result.composer.bottom+1,'Generate stays in the dock');
      assert.ok(result.controls.bottom<=result.composer.bottom+1,'Toolbar stays in the dock');
      assert.ok(result.docWidth<=viewport.width+3,'No horizontal overflow');
      // Pasting within the prompt must not force the reader back down to the end.
      await editor.evaluate(el=>{
        el.scrollTop=0;
        el.setSelectionRange(25,25);
        el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'X'}));
      });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok((await editor.evaluate(el=>el.scrollTop))<10,'Editing earlier lines keeps existing scroll');
      await editor.fill('');
      if(viewport.width<=899)await editor.blur();
      await page.waitForTimeout(275);
      const cleared=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
      if(viewport.width>899){
        const compact=await page.evaluate(()=>({
          expanded:document.getElementById('image-composer').classList.contains('pv-deck-expanded'),
          fieldHeight:document.getElementById('image-composer-prompt').getBoundingClientRect().height,
          hasFocus:document.activeElement?.id==='image-composer-prompt'
        }));
        assert.equal(compact.expanded,false,
          'Deleting all prompt text must immediately clear the desktop expanded state');
        assert.equal(compact.hasFocus,true,
          'The textarea must remain focused after deleting its text');
        assert.ok(compact.fieldHeight<=65,
          'Empty desktop textarea must shrink from the previous long height: '+JSON.stringify(compact));
        assert.ok(Math.abs(cleared-empty)<=4,
          'Empty deck must recover the same compact footprint as before typing: '+JSON.stringify({cleared,empty,compact}));

        // Screenshot regression: populated History uses the two-row deck, and
        // clearing a large prompt must restore its own compact baseline too.
        const historyBaseline=await page.evaluate(()=>{
          document.getElementById('image-gallery-empty').hidden=true;
          return document.getElementById('image-composer').getBoundingClientRect().height;
        });
        await editor.blur();
        await editor.focus();
        assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
          'History must not expand an empty prompt just because it was clicked');
        assert.ok(Math.abs(await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height)-historyBaseline)<4,
          'History deck keeps its original dimensions on focus');
        await editor.fill(longPrompt);
        await page.waitForFunction(()=>document.getElementById('image-composer-prompt')
          .getBoundingClientRect().height>=125,null,{timeout:2500});
        const historyTall=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
        assert.ok(historyTall>historyBaseline+55,
          'Typing in History must expand the two-row deck: '+JSON.stringify({historyTall,historyBaseline}));
        await editor.fill('A quiet Berlin street portrait.');
        assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
          'Shortening a long History prompt should collapse before it is empty');
        assert.ok(Math.abs(await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height)-historyBaseline)<4,
          'The old tall inline editor height cannot keep History expanded');
        await editor.fill('');
        await page.waitForTimeout(75);
        const historyRestored=await page.evaluate(()=>({
          height:document.getElementById('image-composer').getBoundingClientRect().height,
          fieldHeight:document.getElementById('image-composer-prompt').getBoundingClientRect().height,
          expanded:document.getElementById('image-composer').classList.contains('pv-deck-expanded')
        }));
        assert.equal(historyRestored.expanded,false,'History must collapse as soon as its prompt is empty');
        assert.ok(historyRestored.fieldHeight<=65,
          'History must not keep an empty multi-line textarea: '+JSON.stringify(historyRestored));
        assert.ok(Math.abs(historyRestored.height-historyBaseline)<=4,
          'History deck returns to exactly the compact pretyping size: '+JSON.stringify({historyRestored,historyBaseline}));

        // Existing reference guidance remains expanded even without typed text.
        await page.evaluate(()=>{
          const tray=document.getElementById('image-composer-references');
          tray.hidden=false;
          const ref=document.createElement('div');
          ref.className='composer-reference-tile';
          tray.append(ref);
        });
        await page.waitForFunction(()=>document.getElementById('image-composer')
          .classList.contains('pv-deck-expanded'),null,{timeout:2000});
        // A Base photograph stays attached while the Owner deletes a short
        // direction. Neither the deck nor Generate may grow or jump.
        await editor.fill('Keep the photograph intact, remove only the icons.');
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        const baseFilled=await page.evaluate(()=>{
          const deck=document.getElementById('image-composer').getBoundingClientRect();
          const button=document.getElementById('image-composer-generate').getBoundingClientRect();
          return {height:deck.height,bottom:deck.bottom,buttonBottom:button.bottom,fieldHeight:document.getElementById('image-composer-prompt').getBoundingClientRect().height};
        });
        await editor.fill('');
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        const baseCleared=await page.evaluate(()=>{
          const deck=document.getElementById('image-composer').getBoundingClientRect();
          const button=document.getElementById('image-composer-generate').getBoundingClientRect();
          return {height:deck.height,bottom:deck.bottom,buttonBottom:button.bottom,fieldHeight:document.getElementById('image-composer-prompt').getBoundingClientRect().height};
        });
        assert.ok(Math.abs(baseCleared.height-baseFilled.height)<=1,
          'Deleting a short Base prompt cannot resize the attached-photo deck: '+JSON.stringify({baseFilled,baseCleared}));
        assert.ok(Math.abs(baseCleared.bottom-baseFilled.bottom)<=1 &&
          Math.abs(baseCleared.buttonBottom-baseFilled.buttonBottom)<=1,
          'Deleting a Base prompt cannot move the deck or Generate: '+JSON.stringify({baseFilled,baseCleared}));
        assert.ok(Math.abs(baseCleared.fieldHeight-baseFilled.fieldHeight)<=1,
          'The empty Base writing row matches the short text row: '+JSON.stringify({baseFilled,baseCleared}));
        await page.evaluate(()=>{
          // Reproduce stale inline height after an uploaded photo is removed.
          const field=document.getElementById('image-composer-prompt');
          field.style.height='78px';
          const tray=document.getElementById('image-composer-references');
          tray.replaceChildren();
          tray.hidden=true;
        });
        await page.waitForFunction(()=>!document.getElementById('image-composer')
          .classList.contains('pv-deck-expanded'),null,{timeout:2000});
        const afterLastReference=await page.evaluate(()=>({
          height:document.getElementById('image-composer').getBoundingClientRect().height,
          fieldHeight:document.getElementById('image-composer-prompt').getBoundingClientRect().height
        }));
        assert.ok(afterLastReference.fieldHeight<=65,
          'Removing last reference must discard stale inline editor height: '+JSON.stringify(afterLastReference));
        assert.ok(Math.abs(afterLastReference.height-historyBaseline)<=4,
          'Removing last reference must return the identical compact History deck: '+JSON.stringify({afterLastReference,historyBaseline}));
      }else assert.ok(cleared>=90&&cleared<Math.min(viewport.height-40,350),
        'Mobile Image composer remains bounded after blur: '+JSON.stringify({cleared,empty}));
      checks.push({viewport,promptHeight:Math.round(result.field.height),dockHeight:Math.round(result.composer.height),scrollMax:result.scrollMax});
    }finally{await context.close();}
  }
  console.log('PASS image prompt paste expansion, scroll, Generate/toolbar stability: '+JSON.stringify(checks));

  // Actual desktop entrance cards must clear both public and signed-in decks
  // after long paste, photo attachment, viewport resize and returning to empty.
  // The separate History check verifies the deck without a welcome surface.
  const clearance=[];
  for(const role of ['guest','signed-in','history']){
    const context=await browser.newContext({viewport:{width:1920,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.route('https://**/*',route=>route.abort());
    try{
      await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
      await page.evaluate(role=>{
        document.body.classList.remove('lab-booting');document.body.classList.add('lab-ready');
        document.documentElement.classList.remove('pv-studio-boot-lock','pv-studio-route-pending');
        document.getElementById('lab-boot').hidden=true;
        const app=document.getElementById('app'),gate=document.getElementById('gate');
        app.hidden=role==='guest';app.classList.toggle('image-studio-active',role!=='guest');
        gate.hidden=role!=='guest';gate.classList.add('pv-guest-image');gate.dataset.guestTool='image';
        document.getElementById('image-studio').hidden=false;
        document.getElementById('image-gallery-empty').hidden=role==='history';
        document.getElementById('lab-welcome-start').hidden=role==='history';
        document.getElementById('lab-image-empty-intro').hidden=true;
        document.getElementById('image-composer').classList.add('is-seedream');
        document.getElementById('image-composer-references').hidden=true;
      },role);
      await page.addScriptTag({content:"const $=id=>document.getElementById(id);const imageComposer=$('image-composer');"+
        sizing+"\nwindow.__fitDeckTest=fitImageComposerPrompt;"});
      for(const viewport of [{width:390,height:844},{width:1920,height:900},{width:1440,height:900},{width:1280,height:720}]){
        // Phone is covered by the original paste assertions above. Crossing
        // its breakpoint here also verifies desktop measurements reset cleanly.
        await page.setViewportSize(viewport);
        if(viewport.width<1180)continue;
        const selector=role==='guest'?'#pv-guest-prompt':'#image-composer-prompt';
        for(const state of ['empty','long','references','cleared']){
          await page.locator(selector).evaluate((field,{state,text,role})=>{
            const refs=document.getElementById('image-composer-references');
            const attachments=document.getElementById('pv-guest-attachments');
            refs.replaceChildren();refs.hidden=true;attachments.hidden=true;
            if(state==='references'){
              if(role==='guest')attachments.hidden=false;
              else{
                refs.hidden=false;
                const tile=document.createElement('div');tile.className='composer-reference-tile';refs.append(tile);
              }
            }
            field.value=state==='long'||state==='references'?text:'';
            field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}));
            if(role!=='guest')window.__fitDeckTest();
            field.blur();window.dispatchEvent(new Event('pv-guest-photos-changed'));
          },{state,text:longPrompt,role});
          await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(done)))));
          const geometry=await page.evaluate(role=>{
            const guest=role==='guest';
            const deck=document.querySelector(guest?'#pv-guest-composer':'#image-composer').getBoundingClientRect();
            const field=document.querySelector(guest?'#pv-guest-prompt':'#image-composer-prompt');
            const cards=[...document.querySelectorAll(guest?'.pv-guest-card':'.lab-welcome-preset')].filter(el=>el.getBoundingClientRect().width>0);
            const title=document.querySelector(guest?'#gate h1':'#lab-welcome-start h2').getBoundingClientRect();
            return {deckTop:deck.top,deckBottom:deck.bottom,deckHeight:deck.height,
              cardBottom:Math.max(...cards.map(el=>el.getBoundingClientRect().bottom)),
              titleTop:title.top,headerBottom:document.getElementById('studio-header').getBoundingClientRect().bottom,
              font:parseFloat(getComputedStyle(field).fontSize),promptHeight:field.getBoundingClientRect().height,
              scrollWidth:document.documentElement.scrollWidth,value:field.value};
          },role);
          const label=JSON.stringify({role,viewport,state,geometry});
          if(role!=='history')assert.ok(geometry.cardBottom<=geometry.deckTop-15,'Card names and photos clear the actual prompt deck: '+label);
          assert.ok(geometry.deckBottom<=viewport.height-28,'Generate stays above the browser bottom: '+label);
          assert.ok(geometry.promptHeight<=138,'Long desktop prompts stop at the smaller height: '+label);
          assert.equal(geometry.font,13,'Both desktop views use 13px prompt text: '+label);
          assert.ok(geometry.scrollWidth<=viewport.width+2,'No horizontal overflow: '+label);
          assert.equal(geometry.value,state==='long'||state==='references'?longPrompt:'','Sizing preserves all authored text');
          if(role!=='history')assert.ok(geometry.titleTop>=geometry.headerBottom+14,'Heading remains below navigation: '+label);
          clearance.push({role,viewport,state,gap:Math.round(geometry.deckTop-geometry.cardBottom),height:geometry.deckHeight});
          if(viewport.width===1440&&state==='long'){
            mkdirSync('test-artifacts/prompt-deck',{recursive:true});
            await page.screenshot({path:'test-artifacts/prompt-deck/'+role+'-long.png'});
          }
        }
      }
    }finally{await context.close();}
  }
  console.log('PASS measured Image deck clearance and compact text: '+JSON.stringify(clearance));

}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
