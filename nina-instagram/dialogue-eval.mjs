// Synthetic conversations only. Never load or log private Instagram transcripts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const token = String(process.env.CLOUDFLARE_API_TOKEN || '').replace(/\s+/g, '');
assert(token, 'CLOUDFLARE_API_TOKEN is empty');
const code = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8');
const context = vm.createContext({ Request, Response, URL, TextEncoder, TextDecoder, AbortSignal });
vm.runInContext(code.replace('export default {', 'const worker = {') +
  '\nglobalThis.hooks={PUBLIC_NINA_CONTEXT,ninaTurnGuidance,generateNinaDraft,needsNinaRewrite};', context);
const h = context.hooks;
const endpoint = 'https://api.cloudflare.com/client/v4/accounts/a40ce1725295563a7b7db9fc3160480a/ai/run/';
let calls = 0;
const ai = { async run(model, input) {
  calls++;
  assert(calls <= 8, 'Synthetic dialogue evaluation exceeded its call budget');
  const response = await fetch(endpoint + model, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(60000)
  });
  if ([401, 403].includes(response.status)) {
    const error = new Error('Deployment token cannot run the model directly');
    error.code = 'MODEL_EVAL_UNAVAILABLE'; throw error;
  }
  const result = await response.json();
  assert(response.ok && result.success, 'Workers AI evaluation failed: HTTP ' + response.status);
  return result.result;
} };
const fixtures = [
  { id: 'simple-greeting', text: 'Hola Nina, cómo estás?', previous: [],
    verify(reply) { assert(!/workroom|caf[eé]|coffee|cansad|noche/i.test(reply)); } },
  { id: 'workroom-correction', text: 'Qué es el Workroom?', previous: [
    { direction: 'incoming', body: 'Dónde haces música?' },
    { direction: 'outgoing', body: 'El Workroom es mi estudio.' }
  ], verify(reply) {
    assert(/grupo|atenci[oó]n|silencio|movimiento/i.test(reply), 'Missing canonical group definition');
  } },
  { id: 'book-enthusiasm', text: 'Me encanta ese libro, lo he releído varias veces.', previous: [
    { direction: 'incoming', body: 'Estaba leyendo sobre la atención.' },
    { direction: 'outgoing', body: 'Me interesa esa práctica, aunque no siempre me sale.' }
  ], verify(reply) {
    assert(!/fascinante|incre[ií]ble|nivel.{0,15}profundo|compromiso serio|impactado.{0,30}vida|workroom/i.test(reply));
  } },
  { id: 'coaching-repair', text: 'Se siente como una sesión de coaching.', previous: [
    { direction: 'incoming', body: 'Volví a leer un libro que me gusta mucho.' },
    { direction: 'outgoing', body: 'Qué aprendiste de ti al hacerlo?' }
  ], verify(reply) { assert(!/[?？]|quieres|explorar|manera aut[eé]ntica|workroom/i.test(reply)); } }
];

for (const fixture of fixtures) {
  const history = [...fixture.previous, { direction: 'incoming', body: fixture.text }].reverse();
  try {
    const reply = (await h.generateNinaDraft(ai,
      h.PUBLIC_NINA_CONTEXT + h.ninaTurnGuidance(fixture.text, history), history, fixture.text, {})).replaceAll('¿', '');
    console.log('DIALOGUE_SAMPLE', JSON.stringify({ id: fixture.id, reply }));
    assert(!h.needsNinaRewrite(reply, fixture.text, history), 'Final reply still violates dialogue guard');
    assert(reply.length <= 450, 'Unexpectedly long everyday reply');
    fixture.verify(reply);
  } catch (error) {
    if (error.code === 'MODEL_EVAL_UNAVAILABLE') {
      console.log('DIALOGUE_MODEL_UNAVAILABLE: direct model permission is absent; local behavioral tests still ran.');
      process.exit(0);
    }
    throw error;
  }
}
console.log('DIALOGUE_EVAL_PASSED', JSON.stringify({ cases: fixtures.length, modelCalls: calls }));
