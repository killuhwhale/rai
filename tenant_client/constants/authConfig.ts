import { makeRedirectUri } from "expo-auth-session";

const TENANT_REALM = "company-a-realm";

export interface OIDCConfigProps {
  /** Keycloak issuer, _no_ trailing `/auth` or `/token` */
  issuer: string;

  /** Public client for user sign-in (ROPC or PKCE) */
  userClientId: string;
  userRedirectUri: string;
  userScopes: string[];

  /** Confidential client for Admin API (service account) */
  adminClientId: string;
  /** _Never_ ship this to the front-end; only load in your Node server! */
  adminClientSecret?: string;
}

export const oidcConfig: OIDCConfigProps = {
  issuer: `https://reptrackrr.com/keycloak/realms/${TENANT_REALM}`,

  // ▶︎ used by AuthManager.loginKC()/loginGoogle()/loginMicrosoft()
  userClientId: "ropc-client",
  userRedirectUri: makeRedirectUri({ scheme: "http://localhost:8081" }),
  userScopes: ["openid", "profile", "email"],

  // ▶︎ used by your backend for client-credentials grant
  adminClientId: "tenant-admin-cli",
  // adminClientSecret must be injected at runtime via env var on your server
};

// export const oidcConfig = {
//   issuer: 'https://reptrackrr.com/keycloak/realms/company-a-realm',
//   clientId: 'tenant-admin-cli', // serice account to allow user to upload
//   redirectUri: makeRedirectUri({
//     scheme: 'tenant_client',          // your custom URI scheme
//     useProxy: true,                 // for web support
//   }),
//   scopes: ['openid', 'profile', 'email'],
// };
