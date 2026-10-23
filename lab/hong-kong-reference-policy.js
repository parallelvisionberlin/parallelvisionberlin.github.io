// Only exact user-provided photographic references. Supervalu remains Mood artwork.
export const HONG_KONG_REFERENCE_VERSION='hk-two-optical-refs-20261023-v1';
export const HONG_KONG_REFERENCE_MANIFEST=Object.freeze([
  {name:'city-haze',file:'02-city-haze.jpg',mime:'image/jpeg',sha256:'f8d6373d71efd77128cf8a6b81b2ed604f55b5a7f91f539fa6c8648d31adbf0c'},
  {name:'wet-street',file:'03-shop-reflections.jpg',mime:'image/jpeg',sha256:'da4a5fb19618f206cf79b3a750928bfb5e5d421f3125298a00ce761130d50efb'}
].map(Object.freeze));
const limits=Object.freeze({seedream:10,seedreamlite:10,gemini:10,gemini21:10,krea3:4,qwen3:3});
export const hongKongReferenceCount=(p={})=>p.type==='image'&&p.mode==='image'&&p.moodId==='hong-kong-nights'&&Object.hasOwn(limits,p.engine)?2:0;
export const hongKongUserReferenceLimit=(p={})=>hongKongReferenceCount(p)?limits[p.engine]-2:null;
export function hongKongReferenceError(p={},count=0){
  if(p.type!=='image'||p.mode!=='image'||p.moodId!=='hong-kong-nights')return '';
  if(!hongKongReferenceCount(p))return 'Hong Kong Nights requires two original photographic Style references. This model cannot receive them. Choose Seedream, Nano Banana, Krea 3 or Qwen Image 3.0.';
  const max=hongKongUserReferenceLimit(p);
  if(count>max)return 'Hong Kong Nights accepts '+max+' user photo'+(max===1?'':'s')+' with this model plus two built-in Style photos. Remove an upload or choose a model with more input slots.';
  return '';
}
export function hongKongReferenceGuidance(userCount=0,compact=false){
 const a=userCount+1,b=userCount+2;
 if(compact)return 'HK STYLE REFERENCES '+a+'=City taxi (primary: tiny distant green practicals and dark gaps), '+b+'=Wet street (secondary: warm night reflections and localized lit humidity). Preserve Base, warm skin and deep blacks. No whole-frame green cast, invented neon or copied places.';
 return 'HONG KONG NIGHTS BUILT-IN REFERENCES '+a+', '+b+
 '. Reference '+a+' [City taxi / PRIMARY NIGHT DEPTH]: small distant green practical lights fade through real darkness, with deep neutral shadow and no green skin or green wash.'+
 ' Reference '+b+' [Wet street / SECONDARY ATMOSPHERE]: existing lamps illuminate humid depth and broken warm reflections on plausible wet outdoor paving only.'+
 ' The customer Base controls identity, pose, clothing, framing, camera and scene. Borrow optics only, never reference people, cars, places or signs. Preserve natural warm skin and unlit black pockets. No global green veil, fake fog or cyberpunk.';
}
