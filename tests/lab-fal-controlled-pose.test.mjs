import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAL_CONTROLLED_POSE,controlledPoseParameters,controlledPoseRefs,
  controlledPoseEstimateMicros,buildControlledPoseInput
} from '../lab-worker/fal-controlled-pose.mjs';

const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};

test('Controlled Pose validates one pose and 1-4 identity references',()=>{
  const p=controlledPoseParameters({
    type:'image',engine:'fal',prompt:'editorial portrait',aspectRatio:'3:4',
    poseStrength:1,identityStrength:.7,seed:42,
    referenceRoles:[{role:'pose'},{role:'identity'},{role:'identity'}]
  },{fail});
  assert.equal(p.provider,'fal');assert.equal(p.model,FAL_CONTROLLED_POSE);
  assert.deepEqual(controlledPoseRefs(p.referenceRoles,3,{fail}),{pose:0,identity:[1,2]});
  assert.throws(()=>controlledPoseRefs([{role:'pose'},{role:'pose'}],2,{fail}),/exactly one/i);
  assert.throws(()=>controlledPoseRefs([{role:'pose'},{role:'none'}],2,{fail}),/Identity/i);
});

test('Controlled Pose builds FAL EasyControl payload without mixing role semantics',()=>{
  const p=controlledPoseParameters({
    type:'image',engine:'fal',prompt:'black outfit, warm room',aspectRatio:'16:9',
    poseStrength:.9,identityStrength:.65,seed:'',
    referenceRoles:[{role:'pose'},{role:'identity'},{role:'identity'}]
  },{fail});
  const input=buildControlledPoseInput(p,{poseUrl:'https://example.test/pose',identityUrls:['https://example.test/a','https://example.test/b']});
  assert.equal(input.easycontrols[0].control_method_url,'pose');
  assert.equal(input.easycontrols[0].image_control_type,'spatial');
  assert.deepEqual(input.easycontrols.slice(1).map(x=>x.control_method_url),['subject','subject']);
  assert.ok(input.easycontrols.slice(1).every(x=>x.image_control_type==='subject'));
  assert.equal(input.enable_safety_checker,true);
  assert.equal(input.output_format,'png');
  assert.equal('seed' in input,false);
});

test('Controlled Pose estimate follows current FAL per-megapixel rounding model',()=>{
  const square=controlledPoseParameters({type:'image',engine:'fal',prompt:'x',aspectRatio:'1:1',referenceRoles:[]},{fail});
  const wide=controlledPoseParameters({type:'image',engine:'fal',prompt:'x',aspectRatio:'16:9',referenceRoles:[]},{fail});
  assert.equal(controlledPoseEstimateMicros(square),150000);
  assert.equal(controlledPoseEstimateMicros(wide),75000);
});
