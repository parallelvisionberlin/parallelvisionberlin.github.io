# Temporary transfer-integrity repair, removed with the branch workbench.
from pathlib import Path
import hashlib, re, gzip, base64
p=Path('.github/scripts/image-viewer-edit-workbench.mjs')
s=p.read_text()
assert hashlib.sha256(s.encode()).hexdigest()=='c80867cb63d6bc500ea6ef0d657201b62e6ab6c83cadf63ca1e0374fd2a8fa58'
repairs=[
 ('xZyu83qabNYVPFuFuOWL3EPJo1fnZls/','xZyu83qabNYVPFuVOWL3EPJo1fnZls/'),
 ('ZDOt93oc5oQddgsWddmL9UAVyJgIjBC5b1','ZDOt93oc5oQddgsztL9UAVyJgIjBC5b1'),
 ('30QHvkaMVK7YwpLII6gOjmjlosV5QYj2','30QHvkaMVK7YwpLi6gOjmjlosV5QYj2'),
 ('hJgLJV5N2z9gaqXuTuQRj/T0WdCPUwMn','hJgLJV5N2z9gaqXuQRj/T0WdCPUwMn'),
 ('UJl45TxrzAlWIZ6TUjqH5MVt0EAdFXcT','UJl45TxrzAlWIZ6gjqH5MVt0EAdFXcT'),
 ('RNYDxiFBSZ8EHd377Ma2MtshUmmdXMi9','RNYDxiFBSZ8EHd3EMa2MtshUmmdXMi9')]
for old,new in repairs:
 assert s.count(old)==1
 s=s.replace(old,new)
data=gzip.decompress(base64.b64decode(re.search("const encoded='([^']+)'",s).group(1)))
assert hashlib.sha256(data).hexdigest()=='235913a41072c7d336e70258ef5da59f12b0004d0ff519613f4b0583420409f4'
s+='''
const record={id:'image-viewer-replace-edit-actions',title:'Contextual image viewer Replace and Edit',component:'PV LAB Image viewer',status:'needs_verification',updatedAt:new Date().toISOString(),baselineSha:'d3f66d75791d022a6c482dbd2f069196f202dd32',reviewedSha:null,branch:'feat/image-viewer-replace-edit-20261107',summary:'Approved Replace and Edit sidebar cards above Turn into video; main Image deck Retouch action retired. Both cards reuse the existing precision canvas inside the viewer. Replace stages its reviewed mask and reference in the existing Image deck without a generation or model substitution.',nextAction:'Review the source PR and normal CI, then verify the exact Cloudflare Pages production assets. No live or paid generation claim.',files:['lab/lab.js','lab/studio.html','lab/precision-edit.js','lab/image-viewer-editor.js','lab/image-viewer-editor.css','tests/lab-image-replacement-flow-ui.mjs','tests/lab-first-image-instant-browser.mjs','tests/lab-image-oneclick-ui.mjs','lab/IMAGE-REPLACEMENT-WORK-STATE.md'],links:[],tests:[{label:'Approved Image UI, precision and replacement unit suites',result:'passed',scope:'Provider-free contract, mask, draft and backend regression tests'},{label:'Precision and replacement browser suites',result:'passed',scope:'Mocked existing flows plus contextual viewer Edit/Replace at 390 and 1440 pixels'},{label:'Image deck and standalone Retouch regression suites',result:'passed',scope:'Prompt paste, first Image, studio layout and Retouch route navigation'}],deployment:{state:'not_started',environment:'Cloudflare Pages pvlab-studio',sourceSha:null,limitations:['No production asset check yet.','No signed-in live paid generation was performed.']},evidence:[{kind:'automated_test',summary:'All scoped tests passed before the implementation commit.',scope:'Source branch, mocked network requests only',limitations:['Not live-provider evidence.']}],blockers:[],doNotRepeat:['Do not recreate a separate editor or add buttons over the photograph.','Do not change provider, model or billing when opening an action.']};
writeFileSync('/tmp/viewer-owner-record.json',JSON.stringify(record));
run('node',['scripts/owner-work-state.mjs','upsert','/tmp/viewer-owner-record.json']);
run('git',['add','lab/owner-work-records.json']);
// Restore only this temporary transport file before the workflow deletes it.
run('git',['restore','--source=HEAD','--','.github/scripts/image-viewer-edit-workbench.mjs']);
'''
p.write_text(s)
print('Exact original and target file hashes remain enforced before every patch.')
