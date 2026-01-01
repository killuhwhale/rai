# Tenant Onboarding Checklist

For each new customer (“Company A”):

1. **Create a new realm**
   - Keycloak Admin → **Realms** → **Add realm**
   - Name it `companyA` (or your slug) → **Save**

2. **Create a tenant-scoped service-account client**
   - **Clients** → **Create client**
     - Client ID: `tenant-admin-cli`
     - Client Protocol: `openid-connect`
     - Access Type: **confidential**
     - Standard Flow: OFF
     - Direct Access Grants: OFF
     - Service Accounts: ON
   - Click **Save** → **Credentials** tab → copy the **Secret**

3. **Grant that client minimal admin roles**
   - **Clients** → select `tenant-admin-cli` → **Service Account Roles**
   - Under **realm-management**, assign:
     - `view-realm`
     - `manage-identity-providers`

4. **Provide creds to the tenant backend**
   - Give them:
     - **Realm** name (`companyA`)
     - **Client ID** (`tenant-admin-cli`)
     - **Client Secret**
   - They’ll use these to call:
     ```http
     POST /auth/realms/{realm}/protocol/openid-connect/token
     grant_type=client_credentials
     &client_id=tenant-admin-cli
     &client_secret={secret}
     ```

5. **Tenant configures their IdP via Admin API**
   POST to `/auth/admin/realms/{realm}/identity-provider/instances`:
   ```jsonc
   {
     "alias":           "corporate-oidc",
     "providerId":      "oidc",
     "enabled":         true,
     "trustEmail":      true,
     "storeToken":      true,
     "config": {
       "clientId":        "<THEIR_CLIENT_ID>",
       "clientSecret":    "<THEIR_CLIENT_SECRET>",
       "authorizationUrl":"https://login.companyA.com/oauth2/authorize",
       "tokenUrl":        "https://login.companyA.com/oauth2/token",
       "userInfoUrl":     "https://login.companyA.com/oauth2/userinfo",
       "logoutUrl":       "https://login.companyA.com/oauth2/logout",
       "issuer":          "https://login.companyA.com",
       "defaultScope":    "openid profile email"
     }
   }
// e.g. in oidcConfig
issuer = `https://<KEYCLOAK_HOST>/auth/realms/companyA`;