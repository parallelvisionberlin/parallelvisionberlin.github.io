// Node-only shim for the provider's optional WorkerEntrypoint class.
// OAuth, PKCE, signed tokens, scope checks and the real provider remain unmocked.
export async function resolve(specifier,context,nextResolve){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export class WorkerEntrypoint {}',shortCircuit:true};
  return nextResolve(specifier,context);
}
