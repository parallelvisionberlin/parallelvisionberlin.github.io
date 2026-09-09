const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium,webkit}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out='/tmp/site05-preview',evidence='/tmp/site05-evidence';
(async()=>{
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
 await build({entryPoints:[path.join(__dirname,'site05-preview.jsx')],bundle:true,outdir:out,platform:'browser',format:'iife',loader:{'.js':'jsx','.jsx':'jsx','.jpg':'file','.png':'file','.mp4':'file'},assetNames:'media/[name]-[hash]',alias:{'react-native':path.join(root,'node_modules/react-native-web/dist/index.js'),'expo-video':path.join(__dirname,'site05-preview-shims.jsx'),'@clerk/expo':path.join(__dirname,'site05-preview-shims.jsx'),'react-native-webview':path.join(__dirname,'site05-preview-shims.jsx')},define:{'process.env.NODE_ENV':'"production"'}});
 fs.writeFileSync(path.join(out,'index.html'),'<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%;background:#070707}</style><div id="root"></div><script src="/site05-preview.js"></script>');
 const server=http.createServer((req,res)=>{
  const p=path.join(out,decodeURIComponent(new URL(req.url,'http://localhost').pathname));const file=fs.existsSync(p)&&fs.statSync(p).isFile()?p:path.join(out,'index.html');const ext=path.extname(file);const size=fs.statSync(file).size;
  res.setHeader('Content-Type',({'.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.html':'text/html'})[ext]||'application/octet-stream');
  res.setHeader('Accept-Ranges','bytes');
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.setHeader('Content-Length',size);fs.createReadStream(file).pipe(res);}
 });
 await new Promise(resolve=>server.listen(8099,'127.0.0.1',resolve));
 try{
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
   const browser=await engine.launch({headless:true});
   try{
    for(const [width,height] of [[390,740],[320,568]]){
     const page=await browser.newPage({viewport:{width,height}});const problems=[];page.on('pageerror',e=>problems.push(e.message));
     for(const tab of ['HOME','NINA','2063','MUSIC','PROFILE']){
      console.log('Rendering',name,width,tab);
      await page.goto('http://127.0.0.1:8099/?tab='+tab);await page.waitForTimeout(900);
      await page.screenshot({path:path.join(evidence,`${name}-${width}-${tab}.png`)});
      assert.deepEqual(problems,[],`${name} ${tab} JavaScript errors`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${tab} horizontal overflow`);
      if(tab==='HOME'||tab==='NINA'){
       try{await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.currentTime>0;},null,{timeout:12000});}
       catch(e){console.log('MEDIA DIAGNOSTIC',await page.evaluate(()=>{const v=document.querySelector('video');return v?{src:v.currentSrc,ready:v.readyState,paused:v.paused,error:v.error?.message,html:v.outerHTML}:document.body.innerText;}));throw e;}
      }
      await page.screenshot({path:path.join(evidence,`${name}-${width}-${tab}.png`)});
      if(tab==='PROFILE'){await page.getByTestId('account-profile').click();await page.getByLabel('PREFERRED NAME',{exact:true}).fill('Visitor');await page.getByTestId('SAVE PROFILE').click();await page.getByText('Profile saved.',{exact:true}).waitFor();}
     }
     assert.deepEqual(problems,[],`${name} JavaScript errors`);await page.close();
    }
   }finally{await browser.close();}
  }
  console.log('PASS: 20 rendered-screen checks; original local films play in Chromium and WebKit; no horizontal overflow at 320 and 390px; profile saving uses fixtures. Native iPhone rendering and live audio still require device verification.');
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
