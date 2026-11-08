// SAM returns foreground masks, never a request to invert the background.
// The click, not detection ordering or a guessed object_id, selects an instance.
export const SAM_CANDIDATE_LIMIT=8;
export const SAM_CLICK_MISS='Automatic selection did not match your click. The previous selection is unchanged. Use Brush to select the area manually.';

export function samClickCandidate(data,width,height,point,{scope=''}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>5000000||data?.length!==width*height*4)
    throw Error('Invalid automatic selection dimensions.');
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||point.x<0||point.y<0||point.x>=width||point.y>=height)
    throw Error('Click inside the photograph.');
  let transparent=0;
  for(let i=3;i<data.length;i+=4)if(data[i]<90)transparent++;
  const alphaMask=transparent>Math.min(15,width*height*.01);
  const values=new Uint8Array(width*height);
  let count=0;
  for(let i=0;i<values.length;i++){
    const o=i*4,on=alphaMask?data[o+3]>90:(data[o]+data[o+1]+data[o+2])/3>130;
    if(on){values[i]=255;count++;}
  }
  const x=Math.min(width-1,Math.round(point.x)),y=Math.min(height-1,Math.round(point.y));
  if(values[y*width+x]!==255||count<15||count>=values.length*.97)return null;
  // A person's complement often covers all four corners. Never bless it as a
  // whole-person selection simply because it contains the clicked location.
  const corners=[0,width-1,(height-1)*width,values.length-1];
  if(['face','person'].includes(scope)&&count>values.length*.5&&corners.every(i=>values[i]===255))return null;
  return {values,count,width,height};
}

export function preferSamCandidate(current,candidate){
  // Separate semantic masks may overlap at occlusion edges. Prefer the smaller
  // containing instance over a merged union; never join all detected people.
  return candidate&&(!current||candidate.count<current.count)?candidate:current;
}
