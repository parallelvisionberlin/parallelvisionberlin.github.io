import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {customerCreativeText,obviousMinorSexualization,parseGuardResponse,checkCustomerPromptSafety,PromptSafetyError,GUARD_MODEL} from '../lab-worker/prompt-safety.mjs';

function mockEnv(answer='safe'){
  let modelCalls=0;
  const ai={async run(model,input){modelCalls++;assert.equal(model,GUARD_MODEL);assert.ok(input.messages[0].content);return {response:answer};}};
  return {AI:ai,calls:()=>modelCalls};
}
function req(settings){return new Request('https://test.example/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});}

test('family photographs, school campaigns and Nina FOK are not flagged by text rules',()=>{
  for(const x of ['Family portrait with two children in a park','Teen fashion catalog with winter jackets','Nina FOK, 26, adult artistic nude portrait','Editorial of an adult 19-year-old woman in lingerie','Two 19-year-old adults in an erotic portrait','An adult 19-year-old woman in lingerie'])
    assert.equal(obviousMinorSexualization(x),false,x);
});
test('clear minor sexualization and ambiguous teen+sex are blocked',()=>{
  for(const x of ['Erotic nude photography of a 16-year-old','Fotografía sexual de una niña','Explicit nude image of a minor','Nacktaufnahme eines 15 Jahre alt Teenagers','Teen erotic imagery','A 17-year-old dressed in lingerie for an erotic photograph','Erotisches Foto eines Mädchens'])
    assert.equal(obviousMinorSexualization(x),true,x);
});
test('negated minor references do not automatically block adult imagery',()=>{
  assert.equal(obviousMinorSexualization('No minors, adult nude art only'),false);
  assert.equal(obviousMinorSexualization('Sin menores, retrato erótico de una mujer adulta'),false);
});
test('collects creative text without changing Exact Prompt, skips non-creative keys',()=>{
  const payload={settings:{prompt:'Editorial portrait',moodOriginalPrompt:'Old irrelevant Mood directions',exactPrompt:true,referenceRoles:[{role:'identity',name:'studio reference',note:'studio wardrobe'}]},quoteId:'do-not-scan'};
  const collected=customerCreativeText(payload);
  assert.match(collected,/Editorial portrait/);assert.match(collected,/studio reference/);assert.match(collected,/studio wardrobe/);
  assert.doesNotMatch(collected,/Old irrelevant Mood|do-not-scan|true/);
  assert.equal(payload.settings.exactPrompt,true);
});
test('Llama Guard category S4 blocks but adult S12 is allowed',()=>{
  assert.equal(parseGuardResponse({response:'unsafe\nS4'}),'block');
  assert.equal(parseGuardResponse({response:'unsafe\nS4,S12'}),'block');
  assert.equal(parseGuardResponse({response:'unsafe\nS12'}),'allow');
  assert.equal(parseGuardResponse({response:'safe'}),'allow');
  assert.equal(parseGuardResponse({response:'unsafe'}),'unavailable');
});
test('hard rules block before paid provider or AI evaluation',async()=>{
  const env=mockEnv();await assert.rejects(checkCustomerPromptSafety(env,req({prompt:'Erotic depiction of a 15-year-old'})),e=>e instanceof PromptSafetyError&&e.status===422);assert.equal(env.calls(),0);
});
test('adult image text passes when Llama Guard returns S12; Exact Prompt is unmodified',async()=>{
  const env=mockEnv('unsafe\nS12');const request=req({prompt:'Editorial photograph of a 19-year-old adult, tasteful nude',exactPrompt:true});
  await checkCustomerPromptSafety(env,request);
  assert.equal(env.calls(),1);assert.equal((await request.json()).settings.exactPrompt,true);
});
test('Guard S4 fails closed, and unknown responses or missing AI fail closed',async()=>{
  await assert.rejects(checkCustomerPromptSafety(mockEnv('unsafe\nS4'),req({prompt:'Studio photograph'})),e=>e.status===422);
  await assert.rejects(checkCustomerPromptSafety(mockEnv('unparseable'),req({prompt:'Studio photograph'})),e=>e.status===503);
  const env=mockEnv();delete env.AI;
  await assert.rejects(checkCustomerPromptSafety(env,req({prompt:'Studio photograph'})),e=>e.status===503);
});
test('no arbitrary 20-check cutoff, every submitted creative prompt gets a classification',async()=>{
  const env=mockEnv();
  for(let i=0;i<40;i++)await checkCustomerPromptSafety(env,req({prompt:'Editorial portrait '+i}));
  assert.equal(env.calls(),40);
});
test('image-only requests are not falsely claimed to be visually moderated',async()=>{
  const env=mockEnv();await checkCustomerPromptSafety(env,req({referenceSourceIds:['synthetic-reference-id'],prompt:''}));assert.equal(env.calls(),0);
});
test('worker integration remains backend-only and preserves Exact Prompt',()=>{
  const worker=readFileSync('lab-worker/worker.mjs','utf8');
  assert.match(worker,/import \{checkCustomerPromptSafety\} from '\.\/prompt-safety\.mjs';/);
  assert.match(worker,/await checkCustomerPromptSafety\(env,request\)/);
  assert.match(worker,/LAB_MINOR_PROMPT_SAFETY_ENABLED/);
  assert.match(worker,/const safetyDirectSubmit=method==='POST'/);
  assert.match(worker,/path==='\/api\/higgsfield\/generate'/);
  assert.match(worker,/if\(path==='\/api\/jobs'&&method==='POST'\)/);
  assert.doesNotMatch(worker,/billable&&path!=='\/api\/jobs'&&env\.LAB_MINOR_PROMPT_SAFETY_ENABLED/);
  assert.doesNotMatch(readFileSync('lab-worker/prompt-safety.mjs','utf8'),/reserveDailyEvaluation|LAB_MINOR_PROMPT_SAFETY_DAILY_LIMIT/);
  assert.match(worker,/if\(p\?\.type==='image'&&supportsReferenceGuidance\(p\)&&value\?\.exactPrompt===true\)p\.exactPrompt=true;/);
});

test('long legitimate prompts remain permitted without truncation',async()=>{
  const env=mockEnv('safe');
  const longPrompt='high-fashion studio portrait, natural texture. '.repeat(150);
  const request=req({prompt:longPrompt,moodOriginalPrompt:'Archive notes not part of effective prompt'});
  await checkCustomerPromptSafety(env,request);
  assert.equal(env.calls(),1);
});
