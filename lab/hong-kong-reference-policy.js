// Owner-selected original photographic references. Never substitute generated imagery.
export const HONG_KONG_REFERENCE_VERSION='hk-three-originals-20261022-v2-diner-png';
export const HONG_KONG_REFERENCE_MANIFEST=Object.freeze([
  {name:'supervalu',file:'supervalu.jpg',mime:'image/jpeg',sha256:'04b05a9d14a03fc2a3c82e980a235e98d35e715d21a29cacdd2f67fdf559f643'},
  {name:'diner-green-yellow',file:'diner-green-yellow.png',mime:'image/png',sha256:'71e423e7bac896a033778cf361dac17430ae2cfdf8a72ac8b64f3dc30f903d74'},
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
 const a=userCount+1,b=userCount+2,c=userCount+3;
 if(compact)return 'HK STYLE REFERENCES '+a+'=Supervalu (dominant sparse dark green-black), '+b+'=Diner (secondary green/tungsten color), '+c+'=Foggy street (secondary humid depth). Preserve user Base. Real low-light film, no neon spectacle, CGI or green wash.';
 return 'HONG KONG NIGHTS BUILT-IN REFERENCES '+a+', '+b+', '+c+
 '. Reference '+a+' [Supervalu / DOMINANT LOOK]: sparse petrol-black night and distant green haze, rare red.'+
 ' Reference '+b+' [Diner green-yellow / SECONDARY COLOR]: warm-green tungsten and deep blacks.'+
 ' Reference '+c+' [Foggy wet street / SECONDARY DEPTH]: humid distance and wet outdoor reflections.'+
 ' User Base wins; borrow light only. Real low-light film, no neon spectacle, CGI gloss or green wash.';
}
