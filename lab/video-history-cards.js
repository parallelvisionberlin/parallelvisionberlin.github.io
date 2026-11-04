// Presentation only. The existing job record, inspector and actions retain ownership.
export function styleVideoHistoryCard(card,job,{modelLabel,creditNotice='',openDetails}={}){
  card.classList.add('pv-video-history');
  const meta=card.querySelector('.cardmeta');
  if(meta){
    meta.textContent=[modelLabel,job.settings.duration?job.settings.duration+'s':'',job.settings.resolution].filter(Boolean).join(' · ');
    meta.title=[job.status,new Date(job.createdAt).toLocaleString(),modelLabel].filter(Boolean).join(' · ');
  }
  const empty=card.querySelector('.history-no-result');
  if(!empty)return;
  const failed=job.status==='failed';
  const pending=['submitting','queued','running','saving'].includes(job.status);
  if(!failed&&!pending)return;
  const doc=card.ownerDocument;
  const element=(tag,className,text)=>{
    const node=doc.createElement(tag);node.className=className;
    if(text)node.textContent=text;
    return node;
  };
  empty.classList.remove('is-content-restricted');
  empty.classList.add('pv-video-history-state');
  empty.classList.toggle('is-failed',failed);
  const icon=element('span','pv-video-history-indicator',failed?'!':'');
  icon.setAttribute('aria-hidden','true');
  const title=element('strong','pv-video-history-title',failed?'Generation failed':({submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving'}[job.status]));
  const description=failed?(/reject|block|declin|content|policy|moderation/i.test(job.error||'')?'The provider rejected this request.':'No video was returned.'): 'Your video will appear here.';
  const detail=element('span','pv-video-history-copy',description);
  empty.replaceChildren(icon,title,detail);
  // Only show the existing account-aware credit notice; never infer a refund.
  if(failed&&creditNotice)empty.append(element('small','pv-video-history-credit',creditNotice));
  if(failed){
    const view=element('button','pv-video-history-details','View details');view.type='button';
    view.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDetails?.();});
    empty.append(view);
  }
}
