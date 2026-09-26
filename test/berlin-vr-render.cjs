const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.VR_TEST_CHROME || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  WebGLRenderingContext.prototype.makeXRCompatible=async()=>{};
  window.XRWebGLLayer=class {constructor(s,gl){this.gl=gl; this.framebuffer=null;gl.canvas.width=1000;gl.canvas.height=500;document.body.append(gl.canvas);window.testGL=gl;}getViewport(eye){return {x:eye.eye==='left'?0:500,y:0,width:500,height:500};}};
  class Session extends EventTarget {
   constructor(){super();this.inputSources=[];this.visibilityState='visible';this.stopped=false;}
   async requestReferenceSpace(){return {};}
   updateRenderState(s){this.renderState=s;}
   requestAnimationFrame(cb){return window.requestAnimationFrame(t=>{if(this.stopped)return;const projection=new Float32Array([1,0,0,0,0,1,0,0,0,0,-1.001,-1,0,0,-0.1,0]);cb(t,{getViewerPose:()=>({transform:{matrix:identity()},views:['left','right'].map(eye=>({eye,projectionMatrix:projection,transform:{inverse:{matrix:identity()}}}))})});});}
   async end(){this.stopped=true;this.dispatchEvent(new Event('end'));}
  }
  Object.defineProperty(navigator,'xr',{value:{isSessionSupported:async()=>true,requestSession:async()=>window.testSession=new Session(),addEventListener(){}}});
 });
 await page.goto('http://localhost:8765/berlin-2063-vr.html');
 await page.waitForFunction(()=>!document.querySelector('#enter-vr').disabled);
 await page.evaluate(()=>{document.querySelector('#vr-film').currentTime=4});
 await page.waitForFunction(()=>!document.querySelector('#vr-film').seeking);
 await page.click('#enter-vr');
 await page.waitForFunction(()=>document.querySelector('#vr-status').textContent.includes('frames rendered'));
 const pixels=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const gl=window.testGL;const data=new Uint8Array(1000*500*4);gl.readPixels(0,0,1000,500,gl.RGBA,gl.UNSIGNED_BYTE,data);let left=0,right=0;for(let y=0;y<500;y++)for(let x=0;x<1000;x++){let p=(y*1000+x)*4;if(data[p]+data[p+1]+data[p+2]>60){if(x<500)left++;else right++;}}resolve({left,right,error:gl.getError(),status:document.querySelector('#vr-status').textContent});})));
 console.log(JSON.stringify({pixels,errors}));
 if(pixels.left<1000||pixels.right<1000||pixels.error||errors.length)throw new Error('Stereo drawing check failed');
 await page.click('#enter-vr');
 await page.selectOption('#film-quality','lighter');
 await page.waitForFunction(()=>!document.querySelector('#enter-vr').disabled);
 await page.click('#enter-vr');
 await page.waitForFunction(()=>document.querySelector('#vr-status').textContent.includes('frames rendered'));
 console.log('PASS: real WebGL video pixels in both simulated eye viewports, exit, quality switch, re-entry.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
