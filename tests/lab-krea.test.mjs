import test from 'node:test';
import assert from 'node:assert/strict';
import {KREA_TRAINER,KREA_MODEL,KREA_STEPS,KREA_TRAINING_MICROS,isKreaTrigger,kreaTrainingInput,kreaEstimateMicros,kreaInferenceInput} from '../lab-worker/krea-soul.mjs';
import {imageModelLabel} from '../lab/model-labels.js';

const trigger='pvk_nina_fok_a1b2c3';
const weights='https://parallel-vision-lab.parallelvision.workers.dev/soul-weight/b0f563e2-97ee-4b12-931f-0307400c7381';
test('Krea trainer is explicit, billed at $3 for 1000 steps and rejects legacy LoRAs',()=>{
  assert.equal(KREA_TRAINER,'fal-ai/krea-2-trainer');
  assert.equal(KREA_MODEL,'fal-ai/krea-2/turbo/lora');
  assert.equal(KREA_TRAINING_MICROS,3000000);
  assert.ok(isKreaTrigger(trigger));assert.ok(!isKreaTrigger('pv_nina_fok_a1b2c3'));
  const input=kreaTrainingInput('https://example.com/training.zip',trigger);
  assert.equal(input.images_data_url,'https://example.com/training.zip');
  assert.equal(input.trigger_phrase,'photograph of '+trigger);
  assert.equal(input.steps,KREA_STEPS);assert.equal(input.auto_captioning,'Off');
  assert.equal(input.resolution,'1024');
  assert.equal(input.image_data_url,undefined);
  assert.throws(()=>kreaTrainingInput('http://example.com/training.zip',trigger));
  assert.throws(()=>kreaTrainingInput('https://example.com/training.zip','pv_old_a1b2c3'));
});
test('Krea generation has the correct LoRA schema, cost, source isolation and safety checks',()=>{
  for(const aspectRatio of ['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9','9:21']){
    const cost=kreaEstimateMicros(aspectRatio);
    assert.ok(cost>=7000&&cost<=15000);
    const input=kreaInferenceInput({prompt:'Berlin fashion portrait',triggerWord:trigger,weightUrl:weights,identityStrength:0.8,aspectRatio,outputFormat:'png'});
    assert.match(input.prompt,/Berlin fashion portrait/);
    assert.match(input.prompt,/pvk_nina_fok_a1b2c3/);
    assert.deepEqual(input.loras,[{path:weights,scale:0.8}]);
    assert.equal(input.num_images,1);
    assert.equal(input.enable_safety_checker,true);
    assert.equal(input.enable_prompt_expansion,false);
    assert.equal(input.image_url,undefined);
    assert.equal(input.image_size.width>0,true);assert.equal(input.image_size.height>0,true);
  }
  assert.throws(()=>kreaEstimateMicros('source'));
  assert.throws(()=>kreaInferenceInput({prompt:'x',triggerWord:'pv_old_a1b2c3',weightUrl:weights,identityStrength:1,aspectRatio:'1:1',outputFormat:'png'}));
  assert.throws(()=>kreaInferenceInput({prompt:'x',triggerWord:trigger,weightUrl:weights,identityStrength:5,aspectRatio:'1:1',outputFormat:'png'}));
  assert.equal(imageModelLabel({engine:'soul',trainer:'krea2',model:KREA_MODEL}),'Krea 2 LoRA');
  assert.equal(imageModelLabel({engine:'soul',model:'alibaba/qwen-image-2512-lora/text-to-image'}),'PV Soul');
});
