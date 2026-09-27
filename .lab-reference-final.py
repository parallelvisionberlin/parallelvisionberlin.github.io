from pathlib import Path

def change(path, old, new):
    p=Path(path);s=p.read_text();assert s.count(old)==1, (path,old[:100]);p.write_text(s.replace(old,new))

change('lab/lab.js',"options('output-format',upscale?['jpeg','png','webp']:['jpeg','png'],'jpeg');","options('output-format',upscale?['png','jpeg','webp']:['png','jpeg'],'png');")
# Reuse deliberately still restores p.outputFormat; do not convert existing JPEG work.
change('lab/index.html','<option value="jpeg">JPEG</option><option value="png">PNG</option>','<option value="png" selected>PNG</option><option value="jpeg">JPEG</option>')
p=Path('lab/README.md');p.write_text(p.read_text()+'\nNew Image and Upscale forms default to PNG. JPEG remains available. Reuse restores the previously saved output format, including JPEG; existing results are never re-encoded.\n')

# innerText reflects the visual uppercase styling, not the original textContent.
change('tests/lab-reference-ui.mjs',"innerText(),/Result/)","innerText(),/Result/i)")
change('tests/lab-reference-ui.mjs',"let x=await workspace();await x.page.click('#tool-image');",r'''let x=await workspace();await x.page.click('#tool-image');
  assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await x.page.locator('#output-format').selectOption('jpeg');
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  await x.page.click('#tool-upscale');assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await x.page.click('#tool-image');assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  pass('New Image and Upscale default to PNG while JPEG stays available');''')
change('tests/lab-reference-ui.mjs',"assert.equal(draft.referenceSourceIds.length,7);", "assert.equal(draft.settings.outputFormat,'png');assert.equal(draft.referenceSourceIds.length,7);")
change('tests/lab-reference-ui.mjs',"  x=await workspace({fallback:true});",r'''  const jpegJob={...job,settings:{...job.settings,outputFormat:'jpeg'}};
  x=await workspace({jobs:[jpegJob]});await x.page.getByRole('button',{name:'Reuse',exact:true}).click();
  await x.page.waitForFunction(()=>document.querySelector('#prompt').value==='A ceramic sculpture.'&&!document.querySelector('#prompt').disabled);
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
  pass('Reuse preserves an older JPEG setting and never starts a generation');await x.context.close();

  x=await workspace({fallback:true});''')
print('Applied PNG defaults; saved-format behavior unchanged.')
