// SAM foreground is never silently inverted to rescue a missed click.
export const SAM_CANDIDATE_LIMIT=8;
export const SAM_CLICK_MISS='Automatic selection did not match your click. The previous selection is unchanged. Use Brush to select the area manually.';

export function samForegroundCandidate(data,width,height,{scope=''}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>5000000||data?.length!==width*height*4)
    throw Error('Invalid automatic selection dimensions.');
  let transparent=0;
  for(let i=3;i<data.length;i+=4)if(data[i]<90)transparent++;
  const alphaMask=transparent>Math.min(15,width*height*.01),values=new Uint8Array(width*height);
  let count=0;
  for(let i=0;i<values.length;i++){
    const o=i*4,on=alphaMask?data[o+3]>90:(data[o]+data[o+1]+data[o+2])/3>130;
    if(on){values[i]=255;count++;}
  }
  if(count<15||count>=values.length*.97)return null;
  const corners=[0,width-1,(height-1)*width,values.length-1];
  if(['face','person'].includes(scope)&&count>values.length*.5&&corners.every(i=>values[i]===255))return null;
  return {values,count,width,height};
}
export function samClickCandidate(data,width,height,point,{scope=''}={}){
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||point.x<0||point.y<0||point.x>=width||point.y>=height)
    throw Error('Click inside the photograph.');
  const candidate=samForegroundCandidate(data,width,height,{scope});
  if(!candidate)return null;
  const x=Math.min(width-1,Math.round(point.x)),y=Math.min(height-1,Math.round(point.y));
  return candidate.values[y*width+x]===255?candidate:null;
}
export function preferSamCandidate(current,candidate){
  return candidate&&(!current||candidate.count<current.count)?candidate:current;
}
export function samBackgroundCandidate(people){
  // This complement is an explicit Background action, not a missed-click fallback.
  // Reaching the candidate cap may mean undetected people, so refuse to guess.
  if(!Array.isArray(people)||!people.length||people.length>=SAM_CANDIDATE_LIMIT||people.some(p=>!p))
    throw Error('Could not safely identify all people to protect. The previous selection is unchanged. Use Brush for the background.');
  const {width,height}=people[0];
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>5000000)
    throw Error('Invalid background selection dimensions.');
  const protectedPixels=new Uint8Array(width*height);
  for(const person of people){
    if(person.width!==width||person.height!==height||person.values?.length!==protectedPixels.length)
      throw Error('The people masks do not match the photograph.');
    for(let i=0;i<protectedPixels.length;i++)if(person.values[i]===255)protectedPixels[i]=255;
  }
  const values=new Uint8Array(protectedPixels.length);let count=0;
  for(let i=0;i<values.length;i++)if(protectedPixels[i]===0){values[i]=255;count++;}
  if(count<15||count===values.length)throw Error('No safe background selection was found. Use Brush.');
  return {values,count,width,height};
}
