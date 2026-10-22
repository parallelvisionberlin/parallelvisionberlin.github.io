// Owner-selected original photographic references. Never substitute generated imagery.
export const HONG_KONG_REFERENCE_VERSION='hk-three-originals-20261022-v1';
export const HONG_KONG_REFERENCE_MANIFEST=Object.freeze([
  {name:'supervalu',file:'supervalu.jpg',mime:'image/jpeg',sha256:'04b05a9d14a03fc2a3c82e980a235e98d35e715d21a29cacdd2f67fdf559f643'},
  {name:'diner-green-yellow',file:'diner-green-yellow.webp',mime:'image/webp',sha256:'4f28528b626414aa74bb904fc484c160bce624b914f0da20d0609fb116b99adf'},
  {name:'foggy-wet-street',file:'03-shop-reflections.jpg',mime:'image/jpeg',sha256:'da4a5fb19618f206cf79b3a750928bfb5e5d421f3125298a00ce761130d50efb'}
].map(Object.freeze));
const limits=Object.freeze({seedream:10,seedreamlite:10,gemini:10,gemini21:10,krea3:4,qwen3:3});
export const hongKongReferenceCount=(p={})=>p.type==='image'&&p.mode==='image'&&p.moodId==='hong-kong-nights'&&Object.hasOwn(limits,p.engine)?3:0;
export const hongKongUserReferenceLimit=(p={})=>hongKongReferenceCount(p)?limits[p.engine]-3:null;
export function hongKongReferenceError(p={},count=0){
  if(p.type!=='image'||p.mode!=='image'||p.moodId!=='hong-kong-nights')return '';
  if(!hongKongReferenceCount(p))return 'Hong Kong Nights needs three real Style photos. This model cannot receive the pack. Choose Seedream, Nano Banana, Krea 3 or Qwen Image 3.0.';
  const max=hongKongUserReferenceLimit(p);
  if(count>max)return max===0?'The three built-in Hong Kong photos fill Qwen Image 3.0 input slots. To preserve a user Base, choose Seedream, Nano Banana or Krea 3.':
    'Hong Kong Nights accepts '+max+' user photo'+(max===1?'':'s')+' with this model plus three built-in Style photos. Remove an upload or choose another model.';
  return '';
}
export function hongKongReferenceGuidance(userCount=0,compact=false){
  const [a,b,c]=[userCount+1,userCount+2,userCount+3];
  const lead='HONG KONG NIGHTS BUILT-IN REFERENCES '+a+', '+b+', '+c+': three attached original photographs, Style only, with unequal roles. ';
  if(compact)return lead+
    'Reference '+a+' [Supervalu / DOMINANT LOOK]: deep petrol-green dark areas, sparse lights, distant haze and red accents. '+
    'Reference '+b+' [Diner green-yellow / SECONDARY COLOR]: selective yellow-green, warm amber and dark black. '+
    'Reference '+c+' [Foggy wet street / SECONDARY DEPTH]: illuminated humid depth, soft far lights, wet exterior reflections. '+
    'Use photographic lighting, never copy objects, people, shops or taxis. Keep user Base identity, clothes, camera, location and instructions. Real imperfect low-light film, no plastic skin, neon spectacle, wet interiors or uniform green wash.';
  return lead+
    'Reference '+a+' [Supervalu / DOMINANT LOOK]: controls dark exposure, grey-petrol-green nocturnal air, large shadow areas, very sparse light, distant details dissolving softly in haze and restrained red accents. Preserve black space. '+
    'Reference '+b+' [Diner green-yellow / SECONDARY COLOR]: controls only green-yellow and restrained warm tungsten separation, deep blacks, localized halation and subtle optical softness. No uniform yellow faces. '+
    'Reference '+c+' [Foggy wet street / SECONDARY DEPTH]: controls source-lit suspended humidity, depth-dependent diffusion, soft light glow, and uneven wet outdoor reflections; readable foreground, dry interiors. '+
    'Copy only photographic behavior, NEVER their people, architecture, streets, diner, taxi, neon lettering or framing. User Base and assigned roles control identity, body, clothing, pose, camera, composition and location. Honor explicit user direction. '+
    'A single convincing real nocturnal 35mm photograph: underexposed, quiet, expressive, uneven exposure, natural skin, fine irregular embedded film texture. Not a glossy CGI illustration. Let some background details disappear. Do not increase spectacle beyond the reference images. No extra lights, crowds, artificial neon, plastic skin, sharp HDR, heavy gold, green wash, polished rain, new objects or forced wet flooring.';
}
