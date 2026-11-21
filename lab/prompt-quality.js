// PV LAB image quality: deterministic, free, shared by UI preview and Worker.
// User requests and explicitly assigned reference roles always win.
const ENGINES=new Set(['seedream55','seedream','seedreamlite','flash','gemini','gemini21','kling','qwen3','krea3']);
const product=/\b(product|packshot|e-commerce|handbag|watch|perfume|sneaker|bottle|jewell?ery|still.life product)\b/i;
const art=/\b(illustration|painting|watercolou?r|sketch|drawing|anime|cartoon|pixel.art|vector.art|oil.paint|concept.art|3d.render|sculpture)\b/i;
const fashion=/\b(fashion|editorial|lookbook|runway|couture|model|lingerie|underwear|outfit|wardrobe|garment|dress|lace|streetwear|bodysuit)\b/i;
const human=/\b(woman|women|man|men|person|people|portrait|face|eyes?|skin|body|human|girl|boy|her|his|she|he|bedroom|lying on (her|his) side|kneeling)\b/i;
const photograph=/\b(photo(graph(y|ic)?)?|photoreal\w*|camera|lens|35mm|film.still|snapshot|selfie|candid|realistic|lightroom)\b/i;
// Text-only signals, not an image analysis or a claim that an output was inspected.
const multiplePeople=/\b(?:couple|partners|lovers|people|men|women|(?:two|three|four|several|multiple)\s+(?:people|persons|adults|men|women|models|subjects)|group of (?:people|adults|men|women|models|subjects))\b/i;
const pairedPeople=text=>/\b(?:man|male|boyfriend|husband)\b/i.test(text)&&/\b(?:woman|female|girlfriend|wife)\b/i.test(text);
const authoredLighting=/\b(?:light(?:ing)?|sunlight|sunlit|flash|backlit|neon|tungsten|fluorescent|golden.hour|blue.hour)\b/i;
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
 // Blank Base photos need special fidelity instructions to avoid invented
 // people, reconstructed hidden limbs and changed composition.
 if(text.startsWith('Refine the supplied image conservatively into a cleaner,')){
   const fidelity='PHOTO-ONLY FIDELITY: Preserve the existing subject count, recognizable people, placement, visible anatomy and pose. Keep overlapping or hidden limbs and faces occluded; never invent, duplicate or reveal people, limbs, faces or extra body parts. Respect original clothing coverage, contact shadows, scale, texture and scene geometry. Favor restrained photographic coherence, not restaging or AI gloss.';
   const limit=settings.engine==='seedreamlite'?3000:5000;
   return fidelity.length<=limit-currentLength-(settings.moodId?750:50)?fidelity:'';
 }
 const identity=roles.includes('identity'),body=roles.includes('body');
 const multiSubject=multiplePeople.test(text)||pairedPeople(text);
 const person=identity||body||human.test(text)||multiSubject;
 const isArt=art.test(text),isProduct=!person&&product.test(text),isFashion=!isArt&&fashion.test(text);
 const portrait=!isArt&&!isProduct&&person,short=text.length<260,photo=!isArt&&!isProduct&&((portrait||isFashion)||photograph.test(text));
 const parts=[];
 if(identity||body)parts.push('IDENTITY FIRST: '+[
   identity?'Assigned Identity photos control recognizable facial structure, natural eye shape and color, hairline and hairstyle.':'',
   body?'Assigned Body photos control the existing build and proportions. Keep the referenced silhouette, waist, chest, hips, glutes and limb proportions coherent across camera angles; never reshape the body without an explicit request.':'',
   'Apply assigned properties to the subject specified by the user. Preserve other people in the Base unless the user requests an edit to them. Avoid automatic beautification.'
 ].filter(Boolean).join(' '));
 if(isProduct&&short)parts.push('PRODUCT DIRECTION: Preserve actual object geometry, construction, markings and materials. Use physically consistent perspective, highlights and shadows; do not invent labels or accessories.');
 else if(isArt&&short)parts.push('ART DIRECTION: Maintain the requested medium and style. Use intentional composition, form and color. Do not turn illustration or artwork into photography.');
 else if(isFashion&&short)parts.push('FASHION DIRECTION: Use a believable, intentional pose instead of generic catalogue posing. Preserve clothing and styling, with natural fabric tension, folds and responsive lighting.');
 else if(portrait&&short)parts.push('PORTRAIT DIRECTION: Purposeful framing, believable posture and an expression consistent with the requested moment. Preserve the specified pose, setting and lighting.');
 else if(!person&&!isArt&&!isProduct&&photograph.test(text)&&short)parts.push('PHOTOGRAPHIC DIRECTION: Keep perspective, physical scale, light and materials consistent with the requested scene.');
 if(photo&&person&&multiSubject)parts.push('MULTI-PERSON GEOMETRY: Depict each person as one separate, anatomically continuous body with correct ownership of every visible arm, leg, hand and joint. Match the requested camera angle, pose and spatial relationship. Where subjects touch, align hands, limbs, body weight, balance, pressure and support with plausible contact and occlusion; do not invent anatomy concealed behind another body. Keep each assigned face and body reference tied to its own subject, without merging identities or physiques.');
 // A subtle consistency instruction, not an unsolicited new studio-lighting style.
 if(photo&&person&&short&&!settings.moodId&&!roles.includes('lighting')&&!authoredLighting.test(text))
   parts.push('EDITORIAL LIGHT COHERENCE: Keep light motivated by the requested location, with consistent shadow direction, ambient fill and realistic skin highlights. Preserve the chosen atmosphere and color grade; avoid artificial glamour relighting or synthetic gloss.');
 if(photo&&person){
   // Krea, Qwen and Nano interpret extensive instructions differently from Seedream.
   // Use brief fidelity guidance for them; do not override an authored artistic direction.
   if(['qwen3','gemini','gemini21','krea3'].includes(settings.engine)){
     if(short)parts.push('NATURAL HUMAN REALISM: Preserve recognizable facial structure, believable body weight, garment fit, anatomy and skin texture. Honor the supplied pose, clothing and lighting without automatic beautification.');
   }else parts.push('NATURAL HUMAN REALISM: Follow the requested edit and the assigned reference roles. Where eyes are visible, render subtly irregular iris texture, plausible pupil size, realistic eyelids and catchlights consistent with scene lighting; avoid enlarged or glassy eyes. Preserve skin pores, natural tone variation, believable body weight and contact with support surfaces, coherent joints, fabric tension and natural asymmetry. No plastic skin, airbrushing or imposed beauty symmetry. Preserve expressions, poses, ages, outfits and identities except where the requested edit or assigned reference role changes them.');
 }
 if(!parts.length)return '';
 // Optional enhancements must never push a valid user prompt over the cap.
 const limit=settings.engine==='seedreamlite'?3000:5000,available=limit-currentLength-(settings.moodId?750:50);
 const result=[];
 for(const part of parts){if([...result,part].join('\n').length<=available)result.push(part);}
 return result.join('\n');
}
