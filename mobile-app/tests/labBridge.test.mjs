import test from 'node:test';
import assert from 'node:assert/strict';
import {isLabURL,readLabMessage,labReplyScript,moodCommand,sharePayload,LAB_STUDIO} from '../src/labBridge.js';
test('native credentials are only available to the exact Lab HTTPS pages',()=>{
 assert.ok(isLabURL(LAB_STUDIO));
 for(const url of ['https://parallelvisionlabel.com/nina.html','https://evil.example/lab/studio.html','https://parallelvisionlabel.com.evil.example/lab/studio.html','http://parallelvisionlabel.com/lab/studio.html','https://x@parallelvisionlabel.com/lab/studio.html','javascript:alert(1)'])assert.equal(isLabURL(url),false);
 const data=JSON.stringify({type:'PV_LAB_AUTH',id:'1',pageId:'12345678-1234-1234-1234-123456789012'});
 assert.ok(readLabMessage({url:LAB_STUDIO,data}));assert.equal(readLabMessage({url:'https://evil.example',data}),null);
 assert.equal(readLabMessage({url:LAB_STUDIO,data:'{broken'}),null);
 assert.equal(readLabMessage({url:LAB_STUDIO,data:JSON.stringify({type:'PV_LAB_AUTH',id:{},pageId:'bad'})}),null);
 assert.equal(readLabMessage({url:LAB_STUDIO,data:JSON.stringify({type:'PV_LAB_GENERATE'})}),null);
});
test('reply escapes scripts and guards the destination again at injection time',()=>{
 const script=labReplyScript({token:'</script>',pageId:'a',id:'1'});assert.ok(script.includes('location.origin==='));assert.ok(script.includes('location.pathname'));assert.equal(script.includes('</script>'),false);
});
test('mood navigation only selects a mood and never submits a generation',()=>{
 assert.deepEqual(moodCommand(LAB_STUDIO+'&mood=hong-kong-nights'),{action:'mood',mood:'hong-kong-nights'});
 assert.equal(moodCommand('https://evil.example/lab/studio.html?mood=test'),null);
 assert.deepEqual(moodCommand(LAB_STUDIO),{action:'create'});
});
test('sharing only accepts bounded image bytes and ignores untrusted filenames',()=>{
 assert.deepEqual(sharePayload({data:'data:image/png;base64,YWJj',filename:'../../secret'}),{mime:'image/png',extension:'png',base64:'YWJj'});
 for(const data of ['data:text/html;base64,YWJj','https://evil.example/image.png','data:image/png;base64,'])assert.throws(()=>sharePayload({data}));
});

test('Mood photo handoff is bounded to a local UUID and never carries a remote URL',()=>{
 const id='20000000-0000-4000-8000-000000000001';
 assert.deepEqual(moodCommand(LAB_STUDIO+'&mood=night-flash&handoff='+id),{action:'mood',mood:'night-flash',handoff:id});
 assert.deepEqual(moodCommand(LAB_STUDIO+'&mood=night-flash&handoff=https://evil.example'),{action:'mood',mood:'night-flash'});
});
