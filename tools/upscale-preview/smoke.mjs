import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const {chromium} = await import(pathToFileURL(process.argv[3]).href);
const url = process.argv[2];
const browser = await chromium.launch({headless: true});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 960}});
    const external = [];
    const origin = new URL(url).origin;
    await context.route('**/*', async route => {
      const target = new URL(route.request().url());
      if (target.origin !== origin) {
        external.push(target.origin);
        await route.abort();
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const studio = page.frameLocator('#studio');
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.getByRole('heading', {name: 'PV LAB · Upscale de prueba'}).waitFor();
    for (const role of ['Cliente', 'Propietario']) {
      await page.getByRole('button', {name: role, exact: true}).click();
      try {
        await studio.getByRole('button', {name: 'Review Queue', exact: true}).waitFor({timeout: 25000});
        await studio.locator('#preview').waitFor({state: 'visible', timeout: 15000});
      } catch (error) {
        throw new Error(role + ' ' + width + ' did not load. Browser errors: ' + JSON.stringify(errors), {cause: error});
      }
      const generate = studio.getByRole('button', {name: 'Upscale', exact: true});
      assert.equal(await generate.isEnabled(), true);
      await studio.getByRole('button', {name: 'Review Queue', exact: true}).click();
      assert.equal(await studio.locator('#active').evaluate(element => element.open), true);
      await studio.locator('#active>summary').click();
      for (const confirm of [false, true]) {
        const confirmation = page.waitForEvent('dialog', {timeout: 15000});
        const click = generate.click();
        const dialog = await confirmation;
        const message = dialog.message();
        if (confirm) await dialog.accept(); else await dialog.dismiss();
        await click;
        assert.match(message, /Start a separate upscale/);
        assert.match(message, role === 'Cliente' ? /\d+ credits/ : /USD estimated by fal\.ai/);
      }
      const frame = await page.locator('#studio').elementHandle();
      const child = await frame.contentFrame();
      const key = 'pvlab-upscale-pr939-' + (role === 'Cliente' ? 'customer' : 'owner');
      await child.waitForFunction(key => JSON.parse(sessionStorage.getItem(key) ?? '{}').jobs?.length === 2, key);
      const state = await child.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
      assert.deepEqual(state.jobs.map(job => job.status), ['queued', 'uncertain']);
      assert.equal(state.balance < 1000, role === 'Cliente');
      console.log(role + ' at ' + width + 'px: original preserved, decline + one confirmed independent job');
    }
    assert.deepEqual(external, [], 'The preview must make no requests to external services');
    await context.close();
  }
} finally {
  await browser.close();
}
