// One-time Cron-only restore. No unauthenticated HTTP maintenance route.
const ERIC_FILENAME = '07_Eric_Lohela_Shared.pdf';
const ERIC_CANON = "ERIC LOHELA\nPUBLIC PROFESSIONAL CONTEXT + ALEJANDRO-SUPPLIED INTRODUCTION\nPrepared from the Eric Lohela dossier dated 6 October 2026, with relationship context updated 8 October 2026.\nFacts are distinguished from user-reported context. This document contains no scripted openings, questions or\nconversational instructions.\nIdentity\nEric Lohela is the intended contact. The name David Lohela appeared earlier but was corrected to Eric Lohela.\nDavid is not established as an alias.\nProfessional background (source-dated October 2026)\nSecond Nature: The public instructor biography describes Eric as a founder and builder of AI-native\ncompanies, with approximately 15 years in technology-focused management consulting, including a decade at\nSlalom. It describes his work across technology, AI and impact strategy and a practical AI learning program for\nsmall businesses, teams and independent creatives. [1]\nSlalom and public systems: Slalom's City of Oakland case study identifies Eric as Head of Justice and Public\nSafety at the time of that project, involving transparency and oversight dashboards for police stops, use of force,\ncomplaints and related information. This is a historical role, not confirmation of present employment. [2]\nListen Institute: The institute's team listing includes Eric alongside Aza Raskin, Matt Siegel and Ardilla Deneys.\nIts described work concerns biodiversity conservation, research, art, education and community experiences\naround Costa Rica's Osa Peninsula, including a Golfo Dulce hydrophone pilot and an Earth Species Project\npartnership. The listing does not establish Eric's precise duties or that animal language has been decoded. [3]\nOniracom: Its team page lists Eric as Business Strategist. [4]\nLeaderShift and Burning Man: Public LinkedIn listings associate Eric with LeaderShift for Public Safety,\ndescribing a CEO/co-founder role, and with Burning Man involvement beginning around 2012. These are\nself-reported listing details, not independently verified current positions. [5,6]\nEric's present residence, exact current positions, and the details of any relationship with AERTH were not\nestablished by the original research. They remain unspecified.\nConnection to Alejandro and Nina (Alejandro-reported)\nAlejandro Molinari reports knowing Eric personally and speaking with him about Nina FOK, the Parallel Vision\ncity archive and future urban stories on 6 October 2026.\nAlejandro reports that Eric knows Tristan Harris. This is Alejandro's account and does not independently\nestablish the depth of that connection or imply approval, partnership or funding commitments.\nEric was personally invited by Alejandro to experience Nina and the Berlin 2063 project. Their discussion took place in October 2026. This is an introduction, not an established personal friendship between Nina and Eric.\nAlejandro sees the professional exchange with Eric as potentially relevant to Nina's future development. No funding commitment or formal role is established.\nEric's work at the intersection of AI, public systems, listening and conservation is relevant to conversations\naround Nina, Berlin 2063, embodied storytelling and possible future-facing applications. No prior direct\nfriendship between Nina and Eric is established by this document.\nSources and evidence\n[1] Second Nature – Instructor biography: https://meridianstudio.design/second-nature/\n[2] Slalom – City of Oakland: https://www.slalom.com/mx/en/customer-stories/city-of-oakland\n[3] Listen Institute – Far Away Projects: https://farawayprojects.org/listen-institute/\n[4] Oniracom – Team: https://oniracom.com/about/\n[5] LeaderShift for Public Safety – public LinkedIn listing:\nhttps://www.linkedin.com/company/leadershift-for-public-safety\n[6] Eric Lohela – public LinkedIn profile: https://www.linkedin.com/in/eric-lohela\nSources 1–4 were documented as organizational pages in the original 6 October dossier. Sources 5–6 were\ndocumented as public search listings. Relationship/funding context is supplied by Alejandro. No email, access\ncode, address, private communications, or payment details are included.";
function latin1(value) {
  return String(value)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?');
}

function escapePdf(value) {
  return latin1(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapParagraph(text, width = 94) {
  const words = latin1(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function paginate(text) {
  const lines = [];
  for (const raw of String(text).split(/\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) { lines.push(''); continue; }
    lines.push(...wrapParagraph(trimmed));
  }
  const pages = [];
  let page = [];
  for (const line of lines) {
    if (page.length >= 58) { pages.push(page); page = []; }
    page.push(line);
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

function bytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}

function makePdf(text) {
  const pages = paginate(text);
  const objects = new Map();
  const pageIds = [];
  let nextId = 4;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    const commands = ['BT', '/F1 9.5 Tf', '48 800 Td', '12 TL'];
    for (const line of pageLines) commands.push(`(${escapePdf(line)}) Tj`, 'T*');
    commands.push('ET');
    const stream = commands.join('\n') + '\n';
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> /MediaBox [0 0 595 842] /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${bytes(stream).length} >>\nstream\n${stream}endstream`);
  }

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  let binary = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  const maxId = nextId - 1;
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = bytes(binary).length;
    binary += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = bytes(binary).length;
  binary += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) binary += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  binary += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return bytes(binary);
}


export async function restoreEricKnowledgeOnce(env) {
  try {
    if (!env.ANAM_API_KEY || !env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID) return;
    const headers = {Authorization:'Bearer '+env.ANAM_API_KEY};
    const groupId = env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID;
    const list = await fetch('https://api.anam.ai/v1/knowledge/groups/'+encodeURIComponent(groupId)+'/documents',{headers});
    if (!list.ok) throw new Error('list_status_'+list.status);
    const docs=await list.json();
    const existing=docs.find(d=>d.filename===ERIC_FILENAME);
    if(existing){
      console.log('nina_eric_knowledge_restore',JSON.stringify({phase:existing.status==='READY'?'ready':'waiting',status:existing.status,filename:ERIC_FILENAME}));
      return;
    }
    const file = new File([makePdf(ERIC_CANON)], ERIC_FILENAME,{type:'application/pdf'});
    const form = new FormData();
    form.append('file',file);
    form.append('chunkSize','1000');
    form.append('chunkOverlap','200');
    const up=await fetch('https://api.anam.ai/v1/knowledge/groups/'+encodeURIComponent(groupId)+'/documents',{method:'POST',headers,body:form});
    if(!up.ok) throw new Error('upload_status_'+up.status);
    const item=await up.json();
    console.log('nina_eric_knowledge_restore',JSON.stringify({phase:'uploaded',status:item.status,filename:ERIC_FILENAME}));
  }catch(error){
    console.error('nina_eric_knowledge_restore_failure',String(error?.message||error).slice(0,120));
  }
}
