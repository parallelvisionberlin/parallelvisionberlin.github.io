import {createFashionStudio} from './fashion.js?v=20261010-gallery1&optionalFastReady=20261015-1&publicPreview=20261023-1';

// Shadow DOM preserves the Fashion layout without leaking its styles or field IDs into the studio.
export async function mountFashionStudio(host,options){
  const [htmlResponse,cssResponse]=await Promise.all([
    fetch('./fashion.html?v=20261023-editorial02'),
    fetch('./fashion.css?v=20261023-editorial02')
  ]);
  if(!htmlResponse.ok||!cssResponse.ok)throw new Error('Fashion could not load. Try again.');
  const [html,css]=await Promise.all([htmlResponse.text(),cssResponse.text()]);
  const source=new DOMParser().parseFromString(html,'text/html');
  const content=source.getElementById('content');
  if(!content)throw new Error('Fashion workspace is unavailable.');
  // The standalone Fashion page needs its footer. Studio already provides one,
  // so remove the nested copy only when mounting Fashion inside Studio.
  content.querySelector('footer.pv-lab-footer')?.remove();
  if(!document.getElementById('fashion-fonts')){
    const font=source.querySelector('link[href*="fonts.googleapis.com/css"]');
    if(font){const link=document.importNode(font,true);link.id='fashion-fonts';document.head.append(link);}
  }
  const root=host.shadowRoot||host.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=css.replace(/:root\b/g,':host').replace(/\bhtml\s*\{/g,':host{').replace(/\bbody\s*\{/g,':host{display:block;')+
    '\n:host{display:block}#content{max-width:none;padding-inline:clamp(16px,2.3vw,42px)}.result-stage{width:100%;min-width:0;max-width:100%}';
  // Make the editorial workspace unmistakable even when an older cached stylesheet is returned.
  // This is scoped to Fashion's shadow root and cannot affect other Studio tools.
  style.textContent += `
    .fashion-workspace{display:grid!important;grid-template-columns:minmax(320px,.86fr) minmax(0,1.14fr)!important;grid-template-rows:minmax(420px,64vh) auto auto!important;gap:16px 24px!important;padding:26px!important;position:relative!important;isolation:isolate!important;background:#101013!important;overflow:hidden!important;border:1px solid #ffffff30!important;border-radius:12px!important}
    .fashion-workspace:before{content:"";position:absolute;inset:0 0 auto;height:760px;background:linear-gradient(90deg,#08080be6,#09090cb5 40%,#09090c66),url("../assets/fashion-hero.png") center/cover no-repeat;z-index:-2;pointer-events:none}
    .fashion-workspace:after{content:"";position:absolute;inset:0 0 auto;height:760px;background:linear-gradient(0deg,#101013,transparent 45%);z-index:-1;pointer-events:none}
    #fashion-form{display:contents!important}
    .source-section{grid-column:1!important;grid-row:1!important;align-self:center!important}
    .result-panel{grid-column:2!important;grid-row:1!important;align-self:stretch!important;display:flex!important;flex-direction:column!important}
    .engine-section{grid-column:1/-1!important;grid-row:2!important;padding-top:18px!important;background:#111115!important}
    .fashion-gallery{grid-column:1/-1!important;grid-row:3!important;margin-inline:-26px!important;width:calc(100% + 52px)!important;padding-inline:26px!important}
    .image-slot{height:clamp(220px,27vw,370px)!important;min-height:0!important;background:#121316b0!important;backdrop-filter:blur(9px);border-radius:10px!important}
    .result-stage{flex:1!important;height:auto!important;min-height:0!important;background:#111114a6!important;backdrop-filter:blur(5px);border-radius:10px!important}
    .page-intro h1{font-size:clamp(46px,4.6vw,84px)!important}
    .engine-grid{grid-template-columns:minmax(150px,1.1fr) minmax(190px,1fr) minmax(220px,1.4fr) minmax(160px,.9fr)!important}
    @media(max-width:800px){
      .fashion-workspace{grid-template-columns:1fr!important;grid-template-rows:auto auto auto auto!important;padding:16px!important;gap:14px!important}
      .source-section{grid-column:1!important;grid-row:1!important}
      .result-panel{grid-column:1!important;grid-row:2!important}
      .engine-section{grid-column:1!important;grid-row:3!important}
      .fashion-gallery{grid-column:1!important;grid-row:4!important}
      .image-slot{height:auto!important;aspect-ratio:4/5!important}
      .result-stage{min-height:310px!important;aspect-ratio:4/5!important}
      .engine-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .model-block,.direction-block,.action-block,.detail-block{grid-column:1/-1!important}
    }
    @media(max-width:560px){
      .fashion-workspace{padding:12px!important}
      .fashion-workspace:before{height:600px;background:linear-gradient(180deg,#08080a65,#08080aba 45%,#101013 98%),url("../assets/fashion-hero.png") center top/auto 580px no-repeat}
      .source-section{padding-top:125px!important}
      .image-slot{aspect-ratio:4/5!important}
      .fashion-gallery{margin-inline:-12px!important;width:calc(100% + 24px)!important;padding-inline:12px!important}
    }
  `;
  root.replaceChildren(style,document.importNode(content,true));
  const controller=createFashionStudio(root,options);
  await controller.ready;
  return controller;
}
