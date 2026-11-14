// Viewer-only source preparation. No inference, paid retry, or private persistence.
export async function prepareViewerReferenceImages(items, prepare, {check=()=>{},onProgress=()=>{}}={}){
  if(!Array.isArray(items)||items.length>10||typeof prepare!=='function')throw Error('Invalid viewer reference preparation.');
  const results=new Array(items.length);let next=0,completed=0,failure=null;
  const report=()=>onProgress('Preparing images',completed+' / '+items.length+' ready; no generation submitted.');
  check();report();
  async function worker(){
    while(!failure){
      let index;
      try{
        check();index=next++;if(index>=items.length)return;
        const result=await prepare(items[index],index);
        check();if(failure)return;
        results[index]=result;completed++;report();
      }catch(error){failure=error;return;}
    }
  }
  await Promise.all(Array.from({length:Math.min(2,items.length)},()=>worker()));
  if(failure)throw failure;
  check();return results;
}
