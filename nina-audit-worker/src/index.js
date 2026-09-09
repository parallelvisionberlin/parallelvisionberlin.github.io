import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { handleConsent, response, SCOPE, AUDIT } from './access.js';
import { handleProtocol } from './protocol.js';
class Reader extends WorkerEntrypoint {
  async fetch(request) {
    try { return await handleProtocol(request,this.env,this.ctx.props); }
    catch { return response({error:'Reader temporarily unavailable.'},503); }
  }
}
const provider = new OAuthProvider({
  apiRoute:'/mcp', apiHandler:Reader,
  defaultHandler:{async fetch(request,env){
    try { return await handleConsent(request,env); }
    catch { return response({error:'Connection temporarily unavailable.'},503,request.headers.get('Origin')||''); }
  }},
  authorizeEndpoint:'/authorize',tokenEndpoint:'/oauth/token',clientRegistrationEndpoint:'/oauth/register',
  scopesSupported:[SCOPE],
  resourceMetadata:{resource:AUDIT+'/mcp',authorization_servers:[AUDIT],scopes_supported:[SCOPE],resource_name:'Nina owner-only transcript reader'},
  clientIdMetadataDocumentEnabled:true,
  allowImplicitFlow:false,allowPlainPKCE:false,
  accessTokenTTL:3600,refreshTokenTTL:2592000
});
export default provider;
