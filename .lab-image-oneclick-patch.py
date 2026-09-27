from pathlib import Path

def once(text, old, new):
    assert text.count(old) == 1, f'Expected exactly one match: {old[:120]}'
    return text.replace(old,new,1)

p=Path('lab/lab.js');s=p.read_text()
s=once(s,"config.enabled?(tool==='upscale'?'Review price & upscale':'Review price & generate')", "config.enabled?(tool==='image'?'Generate':tool==='upscale'?'Review price & upscale':'Review price & generate')")
s=once(s,"for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;}", "$('generation-help').textContent=(tool==='image'?'Generate starts one paid image at the live provider price, within your daily spending limit. No price-review popup.':'A live quote appears before any paid video or upscale.')+' Inputs over 10 MiB need a working copy; the Lab asks first and keeps the original. Saving history does not generate or charge.';for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.mode-tab,.tool-tab'))el.disabled=busy;}")
s=once(s,'SpicyAPI connected / Video + Image + Upscale · Live quotes before payment','SpicyAPI connected / Images: one-click · Video + Upscale: price review')
start=s.index("$('generate').onclick=()=>action(async()=>{")
end=s.index('function limitFor(kind)',start)
assert "$('quote-dialog').showModal()" in s[start:end]
replacement=r'''// Image generation is authorized by Generate itself. Other tools keep the quote dialog.
async function submitQuotedGeneration(q, expectedEpoch=epoch) {
  if(!owner||epoch!==expectedEpoch)throw new Error('Session changed.');
  if(!q||!Number.isFinite(q.expiresAt)||Date.now()>=q.expiresAt)throw new Error('Quote expired. No generation submitted. Please try again.');
  // Retain the same quote ID through the session-safe request helper. Never reprice/retry a paid task here.
  const data=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}});
  if($('quote-dialog').open)$('quote-dialog').close();
  resetPreview();autoPreview={id:data.job.id,revision:previewRevision};setActive(data.job);
  await loadHistory();
  const failed=['failed','uncertain','resolved'].includes(data.job.status);
  notify(failed?(data.job.error||'The generation was not confirmed. Check History before another attempt.'):
    (q.settings.mode==='image'?'Image requested. Quoted maximum: '+money(q.maxUsd)+' USD. Results appear in History.':'Generation request recorded. You can leave the page and return to History.'),failed);
}
$('generate').onclick=()=>action(async()=>{
  if(!config.enabled){connection();return;}
  if(submissionBlocked())throw new Error('An active-job limit or an interrupted request blocks another generation. Check History.');
  const selectedTool=tool,sessionEpoch=epoch;
  const inputs=await prepareQuoteInputs(await ensureInputs());if(!inputs)return;
  notify(selectedTool==='image'?'Preparing image generation…':'Requesting a live price. No generation submitted.');
  const q=await api('/api/quotes',{method:'POST',body:{...inputs,settings:settings()}});
  if(!owner||epoch!==sessionEpoch||tool!==selectedTool)throw new Error('Session or tool changed. No generation submitted.');
  if(selectedTool==='image'){
    if(q.settings.type!=='image'||q.settings.mode!=='image')throw new Error('Unexpected image quote. No generation submitted.');
    await submitQuotedGeneration(q,sessionEpoch);return;
  }
  currentQuote=q;const isImage=q.settings.type==='image',modeName=q.settings.mode==='reference'?'Reference to Video':'Image to Video';
  $('quote-settings').textContent=q.settings.mode==='upscale'?`Image Upscaler / ${q.settings.resolution.toUpperCase()} / ${q.settings.outputFormat.toUpperCase()} / source ratio kept`:isImage?`Seedream 5.0 Pro / ${q.settings.referenceSourceIds.length?'Reference Edit':'Text to Image'} / ${q.settings.resolution.toUpperCase()} / ${q.settings.aspectRatio}`:`Wan 3.0 / ${modeName} / ${q.settings.duration}s / ${q.settings.resolution}`;
  $('quote-price').textContent=money(q.estimatedUsd);$('quote-limit').textContent=`Quoted maximum: ${money(q.maxUsd)} USD`;
  $('quote-expiry').textContent='Valid until '+new Date(q.expiresAt).toLocaleTimeString()+'. No automatic repricing. '+(q.settings.transferNotes||[]).join(' ');
  $('quote-notice').textContent='';$('confirm-generation').disabled=false;$('quote-dialog').showModal();
});
$('confirm-generation').onclick=async()=>{
  const q=currentQuote;if(!q||busy)return;
  if(Date.now()>=q.expiresAt){$('quote-notice').textContent='Quote expired. Close and review a new price.';return;}
  $('confirm-generation').disabled=true;
  await action(()=>submitQuotedGeneration(q));
};
'''
s=s[:start]+replacement+s[end:];p.write_text(s)

p=Path('lab/index.html');s=p.read_text()
s=once(s,'./lab.js?v=20260927-auth1','./lab.js?v=20260927-image-oneclick')
s=once(s,'<p class="fine">A live quote appears before any paid generation or upscale.', '<p id="generation-help" class="fine">A live quote appears before any paid video or upscale.')
s=once(s,'Your existing provider key is used for all three; prices are quoted before payment.', 'Your existing provider key is used for all three. Image Generate starts one paid image at the live provider price. Video and upscaling keep price review before payment.')
p.write_text(s)

p=Path('lab/README.md');s=p.read_text()
s=once(s,'Review price requests a free live quote for the exact input/settings. A separate confirmation starts the paid request.', 'For Image (text-to-image and reference editing), clicking Generate requests a live quote and submits that exact quoted job directly, without a price-review popup. The button is the user\'s authorization for one paid image. Video and Upscale still require Review price followed by confirmation.')
s=once(s,'Every generation still has its own price review and confirmation.', 'Every generation still uses an exact bound quote, spending checks and idempotency; only Image skips the separate review step.')
s+='\n\n## One-click Image (2026-09-27)\n\nImage Generate starts one paid job per click; it does not start a batch. The editor is held busy through quote and submission, and the actual returned quote ID is reused unchanged. Quote failure or expiry creates no paid task. No automatic repricing, loop or additional generation is introduced. The existing session-renewal helper, four-image capacity, daily budget, reference working-copy permission, History, Reuse and downloads remain unchanged. Video and Upscale retain the price dialog. Backend, provider credentials and stored data are unchanged.\n'
p.write_text(s)

# Existing large-reference image tests must now expect direct submission, not a review dialog.
p=Path('tests/lab-upscale-ui.mjs');s=p.read_text()
old="await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(x.uploads.length,2);"
new="await x.page.click('#generate');await x.page.waitForFunction(()=>!document.querySelector('#resolution').disabled);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.equal(x.uploads.length,2);"
s=once(s,old,new)
s=once(s,"assert.equal(countPaid(x),0);ok('Large reference keeps original and quotes only the small working copy');", "assert.equal(countPaid(x),1);ok('Large reference keeps original, uses working copy and submits one image without review');")
p.write_text(s)
print('Patched Image submission only; Worker, session helper and data unchanged.')
