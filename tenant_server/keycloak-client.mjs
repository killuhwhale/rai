// keycloak-client.js
import express from 'express';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import KcAdminClient from '@keycloak/keycloak-admin-client';



export const kcRouter = express.Router();



export const TENANT_REALM = 'company-a-realm'

async function getTenantAdminClient() {
  const kc = new KcAdminClient({
    baseUrl: 'https://reptrackrr.com/keycloak/auth',
    realmName: TENANT_REALM,
  });
  await kc.auth({
    grantType:    'client_credentials',
    clientId:     process.env.SERVICE_ACCOUNT_CLIENT_ID ?? "",
    clientSecret: process.env.SERVICE_ACCOUNT_CLIENT_SECRET ?? "", // set in your deployment
  });
  return kc;
}




// --- 1) Middleware: validate the caller's access token from Keycloak
kcRouter.use(
  jwt({
    // Dynamically provide a signing key based on the kid in the header and the signing keys provided by your Keycloak
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.TENANT_REALM}/protocol/openid-connect/certs`,
    }),
    issuer:  `${process.env.KEYCLOAK_URL}/realms/${process.env.TENANT_REALM}`,
    algorithms: ['RS256'],
  })
);


kcRouter.use((req, res, next) => {
  const token = (req).auth; // express-jwt puts the payload here
  if (token.azp !== process.env.KEYCLOAK_USER_CLIENT_ID) {
    return res.status(401).json({ message: 'Invalid client (azp)' });
  }
  next();
});

// Body parser (if not already globally applied)
kcRouter.use(express.json());

// interface IdPConfig {
//   alias: string;
//   clientId: string;
//   clientSecret: string;
//   issuer: string;
//   authorizationUrl: string;
//   tokenUrl: string;
//   userInfoUrl: string;
//   logoutUrl: string;
// }
// interface SetupTenantBody {
//   realm: string;
//   idpConfig: IdPConfig;
// }

kcRouter.post('/setup-tenant', async (req, res) => {
  const body = req.body;
  const { realm, idpConfig } = body;
  const url = `${process.env.KEYCLOAK_URL}/admin/realms/${realm}/identity-provider/instances`;
  console.log("Recv'd setup IdP:", realm, idpConfig)

  if (!realm || !idpConfig?.alias) {
    return res.status(400).json({ error: 'realm and idpConfig.alias are required' });
  }

  // --- 2) Authenticate to Keycloak Admin API using client‐credentials
  const kcAdmin = new KcAdminClient({
    baseUrl: process.env.KEYCLOAK_URL,      // e.g. "https://reptrackrr.com/auth"
    realmName: process.env.TENANT_REALM,         // e.g. "master"
  });
  try {
    await kcAdmin.auth({
      grantType:    'client_credentials',
      clientId:     process.env.SERVICE_ACCOUNT_CLIENT_ID,
      clientSecret: process.env.SERVICE_ACCOUNT_CLIENT_SECRET,
    });
  } catch (err) {
    console.error('Failed to auth to Keycloak admin:', err);
    return res.status(500).json({ error: 'Unable to authenticate to Keycloak Admin' });
  }

  // const token = await kcAdmin.auth({
  //   grantType: 'client_credentials',
  //   clientId: process.env.SERVICE_ACCOUNT_CLIENT_ID,
  //   clientSecret: process.env.SERVICE_ACCOUNT_CLIENT_SECRET,
  // }).then(() => kcAdmin.accessToken);

  // const resp = await fetch(url, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(idpConfig),
  // });

  // console.log('url:', url);
  // console.log('raw status:', resp.status);
  // console.log('raw body:', await resp.text());



  // // --- 3) Create realm if it doesn't exist
  // try {
  //   await kcAdmin.realms.create({ realm, enabled: true });
  // } catch (err) {
  //   if (err.response?.status !== 409) {
  //     console.error('Error creating realm:', realm, err);
  //     return res.status(500).json({ error: 'Error creating realm' });
  //   }
  // }

  // --- 4) Add or update the OIDC identity provider in that realm
  try {
    await kcAdmin.identityProviders.create({
      realm,
      alias:      idpConfig.alias,
      providerId: 'oidc',
      enabled:    true,
      trustEmail: true,
      storeToken: true,
      config: {
        clientId:         idpConfig.clientId,
        clientSecret:     idpConfig.clientSecret,
        authorizationUrl: idpConfig.authorizationUrl,
        tokenUrl:         idpConfig.tokenUrl,
        userInfoUrl:      idpConfig.userInfoUrl,
        logoutUrl:        idpConfig.logoutUrl,
        issuer:           idpConfig.issuer,
        defaultScope:     'openid profile email',
      },
    });
  } catch (err) {
    console.error('Error creating identity provider:', err);
    return res.status(500).json({ error: 'Error configuring Identity Provider' });
  }

  return res.json({ success: true });
});



