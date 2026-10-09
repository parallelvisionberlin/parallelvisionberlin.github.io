import {createFashionStudio} from './fashion.js?v=20261010-integrated1';

// Shadow DOM preserves the Fashion layout without leaking its styles or field IDs into the studio.
export async function mountFashionStudio(host,options){
  const [htmlResponse,cssResponse]=await Promise.all([
    fetch('./fashion.html?v=20261010-integrated1'),
    fetch('./fashion.css?v=20261010-integrated1')
  ]);
  if(!htmlResponse.ok||!cssResponse.ok)throw new Error('Fashion could not load. Try again.');
  const [html,css]=await Promise.all([htmlResponse.text(),cssResponse.text()]);
  const source=new DOMParser().parseFromString(html,'text/html');
  const content=source.getElementById('content');
  if(!content)throw new Error('Fashion workspace is unavailable.');
  if(!document.getElementById('fashion-fonts')){
    const font=source.querySelector('link[href*="fonts.googleapis.com/css"]');
    if(font){const link=document.importNode(font,true);link.id='fashion-fonts';document.head.append(link);}
  }
  const root=host.shadowRoot||host.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=css.replace(/:root\b/g,':host').replace(/\bhtml\s*\{/g,':host{').replace(/\bbody\s*\{/g,':host{display:block;')+
    '\n:host{display:block}#content{max-width:none;padding-inline:clamp(16px,2.3vw,42px)}.result-stage{width:100%;min-width:0;max-width:100%}';
  root.replaceChildren(style,document.importNode(content,true));
  const controller=createFashionStudio(root,options);
  await controller.ready;
  return controller;
}
