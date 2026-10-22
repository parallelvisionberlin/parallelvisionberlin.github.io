// PV LAB image quality: deterministic, free, shared by UI preview and Worker.
// User requests and explicitly assigned reference roles always win.
const ENGINES=new Set(['seedream','seedreamlite','flash','gemini','gemini21','kling','qwen3','krea3']);
const product=/\b(product|packshot|e-commerce|handbag|watch|perfume|sneaker|bottle|jewell?ery|still.life product)\b/i;
const art=/\b(illustration|painting|watercolou?r|sketch|drawing|anime|cartoon|pixel.art|vector.art|oil.paint|concept.art|3d.render|sculpture)\b/i;
const fashion=/\b(fashion|editorial|lookbook|runway|couture|model|lingerie|underwear|outfit|wardrobe|garment|dress|lace|streetwear|bodysuit)\b/i;
const human=/\b(woman|women|man|men|person|people|portrait|face|eyes?|skin|body|human|girl|boy|her|his|she|he|bedroom|lying on (her|his) side|kneeling)\b/i;
const photograph=/\b(photo(graph(y|ic)?)?|photoreal\w*|camera|lens|35mm|film.still|snapshot|selfie|candid|realistic|lightroom)\b/i;
const role=x=>typeof x==='string'?x:(x?.role||'none');
export function referenceRoleAdvisories(labels=[]){
 const roles=labels.map(role),count=name=>roles.filter(r=>r===name).length,notes=[];
 const independent=name=>{
   const matching=labels.filter(x=>role(x)===name);
   return matching.length>1&&new Set(matching.map((x,i)=>x?.elementId||'manual-'+i)).size>1;
 };
 if(independent('pose'))notes.push('Multiple Pose photos can request different poses. Choose one controlling pose or remove conflicting pose references.');
 if(independent('room'))notes.push('Multiple Environment photos can describe different locations. Select one environment for the scene.');
 if(independent('outfit'))notes.push('Multiple Clothing photos can disagree on the outfit. Keep one outfit reference or specify the intended pieces.');
 if(independent('body'))notes.push('Multiple Body photos can disagree on proportions. Confirm that they depict the same intended physique.');
 return notes;
}
export function imageQualityGuidance(direction='',labels=[],settings={},currentLength=0){
 if(settings?.type!=='image'||settings?.mode!=='image'||settings?.exactPrompt===true||!ENGINES.has(settings?.engine))return '';
 const text=String(direction||'').trim(),roles=labels.map(role);
 // The intentionally creative photo-only fallback must not inherit the normal
 // portrait constraint that freezes poses, outfits and expressions.
 if(text.startsWith('Create an intentional reinterpretation of the supplied image,')){
   const fidelity='REINTERPRETATION FIDELITY: Keep people identifiable if present, with coherent anatomy, believable surfaces and natural-looking detail wherever relevant. Favor purposeful art direction over retouching or generic AI gloss.';
   const limit=settings.engine==='seedreamlite'?3000:5000;
   return fidelity.length<=limit-currentLength-(settings.moodId?750:50)?fidelity:'';
 }
 const identity=roles.includes('identity'),body=roles.includes('body');
 const person=identity||body||human.test(text);
 const isArt=art.test(text),isProduct=!person&&product.test(text),isFashion=!isArt&&fashion.test(text);
 const portrait=!isArt&&!isProduct&&person,short=text.length<260,photo=!isArt&&!isProduct&&((portrait||isFashion)||photograph.test(text));
 const parts=[];
 if(identity||body)parts.push('IDENTITY FIRST: '+[
   identity?'Assigned Identity photos control recognizable facial structure, natural eye shape and color, hairline and hairstyle.':'',
   body?'Assigned Body photos control the existing build and proportions.':'',
   'General and Style references must not override identity or physique. No beautification, face swapping or body reshaping.'
 ].filter(Boolean).join(' '));
 if(isProduct&&short)parts.push('PRODUCT DIRECTION: Preserve actual object geometry, construction, markings and materials. Use physically consistent perspective, highlights and shadows; do not invent labels or accessories.');
 else if(isArt&&short)parts.push('ART DIRECTION: Maintain the requested medium and style. Use intentional composition, form and color. Do not turn illustration or artwork into photography.');
 else if(isFashion&&short)parts.push('FASHION DIRECTION: Use a believable, intentional pose instead of generic catalogue posing. Preserve clothing and styling, with natural fabric tension, folds and responsive lighting.');
 else if(portrait&&short)parts.push('PORTRAIT DIRECTION: Purposeful framing, believable posture and an expression consistent with the requested moment. Preserve the specified pose, setting and lighting.');
 else if(!person&&!isArt&&!isProduct&&photograph.test(text)&&short)parts.push('PHOTOGRAPHIC DIRECTION: Keep perspective, physical scale, light and materials consistent with the requested scene.');
 if(photo&&person){
   // Krea, Qwen and Nano interpret extensive instructions differently from Seedream.
   // Use brief fidelity guidance for them; do not override an authored artistic direction.
   if(['qwen3','gemini','gemini21','krea3'].includes(settings.engine)){
     if(short)parts.push('NATURAL HUMAN REALISM: Preserve recognizable facial structure, believable body weight, garment fit, anatomy and skin texture. Honor the supplied pose, clothing and lighting without automatic beautification.');
   }else parts.push('NATURAL HUMAN REALISM: Keep the reference face and anatomy intact. Where eyes are visible, render subtly irregular iris texture, plausible pupil size, realistic eyelids and catchlights consistent with scene lighting; avoid enlarged or glassy eyes. Preserve skin pores, natural tone variation, believable body weight and contact with support surfaces, coherent joints, fabric tension and natural asymmetry. No plastic skin, airbrushing or imposed beauty symmetry. Do not change expression, pose, age, outfit or person.');
 }
 if(!parts.length)return '';
 // Optional enhancements must never push a valid user prompt over the cap.
 const limit=settings.engine==='seedreamlite'?3000:5000,available=limit-currentLength-(settings.moodId?750:50);
 const result=[];
 for(const part of parts){if([...result,part].join('\n').length<=available)result.push(part);}
 return result.join('\n');
}
