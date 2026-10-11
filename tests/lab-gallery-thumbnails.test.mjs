import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GALLERY_THUMB_EDGE,GALLERY_THUMB_QUALITY,GALLERY_THUMB_VERSION,galleryThumbnailKey,serveGalleryThumbnail} from '../lab-worker/gallery-thumbnails.mjs';

const PNG=new Uint8Array([137,80,78,71,13,10,26,10,0]);
const WEBP=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
const asset={id:'a1000000-0000-4000-8000-000000000021',owner_id:'owner-a',object_key:'owner-a/results/full.png',mime:'image/png',bytes:PNG.length,kind:'source'};

function fixture({images=true}={}){
 const objects=new Map([[asset.object_key,PNG]]),calls={originalReads:0,thumbnailReads:0,put:0,transform:0,output:0};
 const env={LAB_MEDIA:{
   async get(key){
     if(key===asset.object_key)calls.originalReads++;else calls.thumbnailReads++;
     const bytes=objects.get(key);
     return bytes?{body:new Response(bytes).body,size:bytes.length}:null;
   },
   async put(key,body,options){
     calls.put++;
     assert.equal(options.httpMetadata.contentType,'image/webp');
     objects.set(key,new Uint8Array(body));
   }
 }};
 if(images)env.IMAGES={
   input(stream){assert.ok(stream);return {
     transform(opts){
       calls.transform++;
       assert.deepEqual(opts,{width:800,height:800,fit:'scale-down'});
       return this;
     },
     output(opts){
       calls.output++;
       assert.deepEqual(opts,{format:'image/webp',quality:82,anim:false});
       return {response:()=>new Response(WEBP,{headers:{'Content-Type':'image/webp'}})};
     }
   };}
 };
 return {env,objects,calls};
}

test('thumbnail is a sharp, downscaled WebP and never overwrites original image',async()=>{
 const {env,objects,calls}=fixture();
 assert.equal(GALLERY_THUMB_EDGE,800);
 assert.equal(GALLERY_THUMB_QUALITY,82);
 assert.match(GALLERY_THUMB_VERSION,/v1/);
 const key=galleryThumbnailKey(asset);
 assert.ok(key.startsWith('owner-a/thumbnails/'));
 assert.ok(key.endsWith('/'+asset.id+'.webp'));
 const first=await serveGalleryThumbnail(env,asset);
 assert.equal(first.status,200);
 assert.equal(first.headers.get('content-type'),'image/webp');
 assert.equal(first.headers.get('cache-control'),'private, no-store');
 assert.equal(first.headers.get('x-pv-preview'),'webp-800');
 assert.deepEqual(new Uint8Array(await first.arrayBuffer()),WEBP);
 assert.deepEqual(objects.get(asset.object_key),PNG);
 assert.deepEqual(objects.get(key),WEBP);
 assert.equal(calls.originalReads,1);
 assert.equal(calls.transform,1);
 assert.equal(calls.put,1);
 const second=await serveGalleryThumbnail(env,asset);
 assert.equal(second.status,200);
 assert.deepEqual(new Uint8Array(await second.arrayBuffer()),WEBP);
 assert.equal(calls.transform,1,'cached thumbnails do not get recompressed');
 assert.equal(calls.originalReads,1,'original is not reread after thumbnail is cached');
});

test('thumbnail limits are safe, and failure never mutates original',async()=>{
 const {env,objects,calls}=fixture({images:false});
 const missing=await serveGalleryThumbnail(env,asset);
 assert.equal(missing.status,503);
 assert.equal(missing.headers.get('cache-control'),'no-store');
 assert.equal(calls.originalReads,0);
 env.IMAGES={input(){throw Error('Synthetic transformation failure')}};
 const failed=await serveGalleryThumbnail(env,asset);
 assert.equal(failed.status,503);
 assert.deepEqual(objects.get(asset.object_key),PNG);
 assert.equal(calls.put,0);
 const tooLarge=await serveGalleryThumbnail(env,{...asset,bytes:21_000_000});
 assert.equal(tooLarge.status,422);
 assert.equal(calls.originalReads,1,'large images must not be passed to the Images binding');
 assert.equal((await serveGalleryThumbnail(env,{...asset,mime:'video/mp4'})).status,415);
});

test('gallery requests previews while modal, download and original inspection load full files',()=>{
 const ui=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
 const wrangler=readFileSync(new URL('../lab-worker/wrangler.toml',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 assert.match(ui,/async function assetThumbnailBlob\(id\)/);
 assert.match(ui,/api\/assets\/['"]\+encodeURIComponent\(id\)\+'\/thumbnail'/);
 assert.match(ui,/void assetThumbnailBlob\(img\.dataset\.asset\)/);
 assert.match(ui,/assetThumbnailBlob\(assetId\)\.then\(blob/);
 assert.match(ui,/void assetBlob\(assetId\)\.then\(blob/);
 assert.match(ui,/async function openVideo\(job,/);
 assert.match(ui,/blob=await assetBlob\(job\.outputId\)/);
 assert.match(ui,/async function downloadJob\(job\)/);
 assert.match(worker,/return serveGalleryThumbnail\(env,a\)/);
 assert.match(worker,/if\(path\.startsWith\('\/api\/assets\/'\)&&method==='GET'\)/);
 assert.match(wrangler,/\[images\]\s*binding\s*=\s*"IMAGES"/);
 assert.match(studio,/galleryThumb=1/);
});
