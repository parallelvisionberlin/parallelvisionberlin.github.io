import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { authHandler, mcpHandler, SCOPE, ORIGIN } from './access.js';

// Separate deployment. No ANAM/Stripe keys, writes to Nina data, scheduled tasks or public transcript endpoints.
export default new OAuthProvider({
  apiRoute:'/mcp', apiHandler:mcpHandler, defaultHandler:authHandler,
  authorizeEndpoint:'/authorize', tokenEndpoint:'/oauth/token', clientRegistrationEndpoint:'/oauth/register', clientIdMetadataDocumentEnabled:true,
  scopesSupported:[SCOPE], allowImplicitFlow:false, allowPlainPKCE:false,
  accessTokenTTL:3600, refreshTokenTTL:30*86400,
  resourceMetadata:{resource:ORIGIN+'/mcp',authorization_servers:[ORIGIN],scopes_supported:[SCOPE],
    bearer_methods_supported:['header'],resource_name:'Nina owner read-only analysis'}
});
