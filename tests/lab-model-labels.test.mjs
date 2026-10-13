import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageModelLabel} from '../lab/model-labels.js';

// Provider-verified engine/model values occur in PV LAB's production jobs.
// The label must describe the model that generated the saved result,
// not the current Studio selection and never a blanket Seedream Pro fallback.
const cases=[
  [{engine:'seedream',model:'bytedance/seedream-5.0-pro/edit'},'Seedream 5 Pro'],
  [{model:'bytedance/seedream-5.0-pro/edit'},'Seedream 5 Pro'], // early owner jobs
  [{engine:'seedreamlite',model:'bytedance/seedream-5.0-lite/text-to-image'},'Seedream 5 Lite'],
  [{engine:'seedreamlite',model:'bytedance/seedream-5.0-lite/edit'},'Seedream 5 Lite'],
  [{engine:'seedreamlite'},'Seedream 5 Lite'], // local preparing card / draft
  [{engine:'qwen3',model:'alibaba/qwen-image-3.0/text-to-image'},'Qwen Image 3.0'],
  [{engine:'qwen3',model:'alibaba/qwen-image-3.0/edit'},'Qwen Image 3.0'],
  [{engine:'zspicy',model:'alibaba/z-image-spicy/text-to-image'},'Z-Image Spicy'],
  [{engine:'flash',provider:'openrouter',model:'bytedance-seed/seedream-5-0-flash'},'Seedream Flash'],
  [{engine:'kling',model:'fal-ai/kling-image/v3/text-to-image'},'Kling V3'],
  [{engine:'gemini',model:'gemini-3-pro-image'},'Nano Banana Pro'],
  [{engine:'soulpro',soulProModel:'ideogram45',model:'ideogram/v4.5/edit'},'Ideogram 4.5'],
  [{engine:'soulpro',soulProModel:'kontextmax',model:'fal-ai/flux-pro/kontext/max/multi'},'FLUX Kontext Max'],
  [{engine:'soulpro',soulProModel:'soul2',model:'higgsfield-ai/soul/v2/image-to-image'},'Higgsfield Soul 2'],
  [{engine:'soulpro',provider:'higgsfield',mode:'identity-edit'},'PV Soul Pro'],
  [{provider:'higgsfield',mode:'soul-id-training'},'Soul ID training'],
  [{engine:'soul',mode:'reinterpret',model:'alibaba/z-image-turbo-lora/edit'},'PV Soul · Reinterpret'],
  [{engine:'soul',model:'alibaba/qwen-image-2512-lora/text-to-image'},'PV Soul'],
  [{engine:'fal',mode:'controlled-pose',model:'fal-ai/flux-general'},'FLUX Controlled Pose'],
  [{engine:'fal',mode:'controlled-repair',model:'fal-ai/flux-general/inpainting'},'FLUX Precision Edit'],
  [{engine:'fashion',model:'fal-ai/fashn/tryon/v1.6'},'FASHN Try-On'],
  [{engine:'fashion',model:'tryon-max'},'FASHN Try-On Max']
];

test('Gallery and detail names preserve the exact image model recorded by every provider',()=>{
 for(const [settings,want] of cases)assert.equal(imageModelLabel(settings),want,JSON.stringify(settings));
});
test('A stale selected engine cannot override a confirmed different provider model',()=>{
 assert.equal(imageModelLabel({engine:'seedream',model:'bytedance/seedream-5.0-lite/edit'}),'Seedream 5 Lite');
 assert.equal(imageModelLabel({engine:'seedreamlite',model:'bytedance/seedream-5.0-pro/edit'}),'Seedream 5 Pro');
 assert.equal(imageModelLabel({engine:'gemini',model:'alibaba/qwen-image-3.0/edit'}),'Qwen Image 3.0');
 assert.equal(imageModelLabel({engine:'seedream',model:'another-provider/new-model'}),'Image model');
 assert.equal(imageModelLabel({engine:'soulpro',soulProModel:'ideogram45',model:'higgsfield-ai/soul/v2/image-to-image'}),'Higgsfield Soul 2');
});
test('Unknown or incomplete records are never silently called Seedream Pro',()=>{
 for(const unknown of [{},null,{engine:'experimental',model:'next-gen/something'},{provider:'spicy'}])
   assert.equal(imageModelLabel(unknown),'Image model');
});
test('Pending result cards, History, Assets, viewer and price summary share exact model labels',()=>{
 const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 assert.match(source,/import \{imageModelLabel\} from '\.\/model-labels\.js\?v=/);
 assert.match(source,/function detailModelName\(job\)[\s\S]*?imageModelLabel\(settings\)/);
 assert.match(source,/function galleryImageModelName\(job\)[\s\S]*?return detailModelName\(job\)/);
 assert.match(source,/pendingImageCards\.set\(id,\{id,ratio,title:'Preparing',detail:detailModelName\(\{settings:selected\}\)/);
 assert.match(source,/\$\('image-detail-model'\)\.textContent=detailModelName\(job\)/);
 assert.match(source,/modelLabel=image\?galleryImageModelName\(j\)\.toUpperCase\(\)/);
 assert.match(source,/imageName=p\.mode==='upscale'\?'Upscale':imageModelLabel\(p\)/);
 assert.match(source,/\$\('reference-provider'\)\.textContent=imageModelLabel\(\{engine:imageEngine\}\)/);
 assert.match(source,/isImage?\x60\$\{imageModelLabel\(q\.settings\)\}/);
 assert.match(studio,/modelLabels=1/);
 assert.doesNotMatch(source,/function detailModelName\(job\)[\s\S]{0,800}return 'Seedream 5 Pro'/);
});
