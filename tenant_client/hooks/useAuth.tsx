// auth/useAuth.js
import { useState, useEffect, useCallback, useRef } from "react";
import * as AuthSession from "expo-auth-session";
import { oidcConfig } from "@/constants/authConfig";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { jwtDecode } from "jwt-decode";
import {
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
} from "@/constants/storage";
import { authManager } from "@/constants/AuthManager";

const REFRESH_KEY = "OIDC_REFRESH_TOKEN";

WebBrowser.maybeCompleteAuthSession();

type KC_OAUTH_PROPS = {
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  session_state: string;
  at_hash: string;
  acr: string;
  sid: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
};

type GOOGLE_OAUTH_PROPS = {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  nbf: number;
  name: string;
  picture: string;
  given_name: string;
  iat: number;
  exp: number;
  jti: string;
};

function decodeKCJWT(result: any) {
  try {
    const idPayload = jwtDecode<KC_OAUTH_PROPS>(result.idToken);
    console.log("ID token payload:", idPayload);
    return idPayload;
  } catch (err) {
    console.log("FAiled to decode JWT: ", err);
    console.log("Tried decoding: ", result.idToken);
  }
  return {} as KC_OAUTH_PROPS;
}
function decodeGoogleJWT(token: any) {
  try {
    const idPayload = jwtDecode<GOOGLE_OAUTH_PROPS>(token);
    console.log("ID token payload:", idPayload);
    return idPayload;
  } catch (err) {
    console.log("FAiled to decode JWT: ", err);
    console.log("Tried decoding: ", token);
  }
  return {} as GOOGLE_OAUTH_PROPS;
}

export function useAuth() {
  const redirectUri = makeRedirectUri({
    scheme: "http://localhost:8081", // your native scheme
    // useProxy: true,         // this makes web use the Expo proxy under the hood
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: oidcConfig.clientId,
      redirectUri,
      scopes: oidcConfig.scopes,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    {
      authorizationEndpoint: `${oidcConfig.issuer}/protocol/openid-connect/auth`,
      tokenEndpoint: `${oidcConfig.issuer}/protocol/openid-connect/token`,
      revocationEndpoint: `${oidcConfig.issuer}/protocol/openid-connect/revoke`,
    }
  );

  const [authState, setAuthState] = useState(null);
  const [jwt, setJWT] = useState<KC_OAUTH_PROPS | GOOGLE_OAUTH_PROPS>(
    {} as KC_OAUTH_PROPS
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // const [SSOProvider, setSSOProvider] = useState("KC");
  const SSOProvider = useRef("KC");

  // 1) On mount, try restore+refresh from SecureStore
  useEffect(() => {
    (async () => {
      if (SSOProvider.current !== "KC") return;

      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        try {
          console.log(
            "Refresh Async called.  SSOProvider.current: ",
            SSOProvider.current
          );
          const result = await AuthSession.refreshAsync(
            {
              clientId: oidcConfig.clientId,
              refreshToken,
            },
            {
              tokenEndpoint:
                oidcConfig.issuer + "/protocol/openid-connect/token",
            }
          );
          console.log("Setting refreshToken", result);
          setAuthState(result);
          setJWT(decodeKCJWT(result));
          setIsAuthenticated(true);
          await setRefreshToken(result.refreshToken);
          authManager.notifyLogin(true);
        } catch (err: any) {
          await removeRefreshToken();
          authManager.notifyLogin(false, err.toString());
        }
      }
      setLoading(false);
    })();
  }, []);

  // 2) Handle the response from promptAsync → exchange code for tokens
  useEffect(() => {
    if (SSOProvider.current !== "KC") return;
    console.log("Resp:", response);
    if (response?.type === "success" && response.params.code) {
      (async () => {
        setLoading(true);
        try {
          const result = await AuthSession.exchangeCodeAsync(
            {
              clientId: oidcConfig.clientId,
              code: response.params.code,
              redirectUri: oidcConfig.redirectUri,
              extraParams: {
                code_verifier: request?.codeVerifier ?? "", // ← this is the fix
              },
            },
            {
              tokenEndpoint:
                oidcConfig.issuer + "/protocol/openid-connect/token",
            }
          );
          setAuthState(result);
          setJWT(decodeKCJWT(result));
          setIsAuthenticated(true);
          await setRefreshToken(result.refreshToken);
          authManager.notifyLogin(true);
        } catch (err: any) {
          console.log("Failed to exchange code: ", err);
          authManager.notifyLogin(false, err.toString());
        }
        setLoading(false);
      })();
    }
  }, [response]);

  // 3) Exposed signIn & signOut
  const signIn = useCallback(() => {
    SSOProvider.current = "KC";
    promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    if (authState?.refreshToken) {
      console.log("Loggin out!");

      await AuthSession.revokeAsync(
        {
          token: authState.refreshToken,
          clientId: oidcConfig.clientId,
        },
        {
          revocationEndpoint:
            oidcConfig.issuer + "/protocol/openid-connect/revoke",
        }
      );
      await removeRefreshToken();
      authManager.notifyLogout();
      SSOProvider.current = "";
    }
    setAuthState(null);
  }, [authState]);

  // 4) Ensure valid access token (auto-refresh if needed)
  const getAccessToken = useCallback(async () => {
    if (SSOProvider !== "KC") return;
    if (!authState) throw new Error("Not signed in");
    const expires = new Date(authState.accessTokenExpirationDate).getTime();
    if (expires - Date.now() < 60_000) {
      // about to expire → refresh
      const result = await AuthSession.refreshAsync(
        {
          clientId: oidcConfig.clientId,
          refreshToken: authState.refreshToken,
        },
        {
          tokenEndpoint: oidcConfig.issuer + "/protocol/openid-connect/token",
        }
      );
      setAuthState(result);

      await setRefreshToken(result.refreshToken);
      return result.accessToken;
    }
    return authState.accessToken;
  }, [authState]);

  const registerGoogleLogin = async (token: string) => {
    try {
      SSOProvider.current = "GOOGLE";
      console.log("Registering Google Login!");
      setAuthState(token);
      setJWT(decodeGoogleJWT(token));
      setIsAuthenticated(true);
      await setRefreshToken(token);
      authManager.notifyLogin(true);
    } catch (err) {
      authManager.notifyLogin(false, err.toString());
      setAuthState(null);
    }
  };

  return {
    loading,
    isAuthenticated,
    signIn,
    signOut,
    getAccessToken,
    jwt,
    registerGoogleLogin,
  };
}
