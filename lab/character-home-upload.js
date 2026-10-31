import {saveModelPhoto} from './editorial-model-handoff.js?v=20261031-model-upload1';
const input=document.getElementById('home-model-photo');
const message=document.getElementById('home-model-status');
const buttons=[...document.querySelectorAll('[data-model-upload]')];
for(const button of buttons)button.addEventListener('click',()=>input.click());
input.addEventListener('change',async()=>{
 const file=input.files?.[0];if(!file)return;
 input.value='';buttons.forEach(button=>button.disabled=true);
 message.hidden=false;message.textContent='Opening your model…';
 try{
  const id=await saveModelPhoto(file);
  const destination=new URL('./full-editorial.html',location.href);
  destination.searchParams.set('modelPhoto',id);location.assign(destination.href);
 }catch(error){message.textContent=error.message;buttons.forEach(button=>button.disabled=false)}
});
window.addEventListener('pageshow',()=>{buttons.forEach(button=>button.disabled=false);message.hidden=true});
