// Discovery-only classification. No Mood, prompt, model or billing behavior lives here.
// Every concept has one primary family; optional secondary families improve discovery.
export const INSPIRATION_FILTERS=Object.freeze([
  'All','Fashion','Film & Analog','After Hours','Street','Future','Intimacy','Atmospheres'
]);

const originalPrimary=Object.freeze({
  'dream-blur':'Atmospheres',
  '90s-cinema':'Film & Analog',
  'fashion-editorial':'Fashion',
  'fisheye-2000':'Street',
  'chrome-couture':'Fashion',
  'hong-kong-nights':'Street',
  'dreamcore':'Atmospheres',
  '80s-film':'Film & Analog'
});

const secondary=Object.freeze({
  'desert-stop':['Film & Analog'],
  'lost-highway':['Fashion'],
  'chrome-couture':['Future'],
  'chrome-skin':['Future'],
  'chrome-oracle':['Fashion'],
  'eros-lingerie':['Fashion'],
  'hotel-intimacy':['After Hours'],
  'hotel-afterparty':['Intimacy'],
  'tokyo-4am':['Street'],
  'berlin-club':['Street'],
  'night-flash':['After Hours'],
  'raver':['Future'],
  'hong-kong-nights':['After Hours'],
  'night-drive':['Film & Analog'],
  'red-room':['Fashion'],
  'post-human':['Intimacy']
});

export function inspirationCategories(item){
  if(!item)return [];
  const primary=item.original?originalPrimary[item.id]:
    item.category==='Cinema'||item.category==='Analog'?'Film & Analog':item.category;
  if(!INSPIRATION_FILTERS.includes(primary)||primary==='All')return [];
  return [primary,...(secondary[item.id]||[]).filter(name=>name!==primary)];
}
