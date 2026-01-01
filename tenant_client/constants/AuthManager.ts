import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import {
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getIdToken,
  setIdToken,
  removeIdToken,
  getProvider,
  setProvider,
  removeProvider,
} from "@/constants/storage";
import { jwtDecode } from "jwt-decode";
import { oidcConfig } from "./authConfig";

export type SSOProvider = "KC" | "GOOGLE" | "MICROSOFT" | "";

export type KC_OAUTH_PROPS = {
  /* ...unchanged... */
};
export type GOOGLE_OAUTH_PROPS = {
  /* ...unchanged... */
};
export type MICROSOFT_OAUTH_PROPS = {
  /* ...unchanged... */
};

export type AuthState = {
  provider: SSOProvider;
  isAuthenticated: boolean;
  loading: boolean;
  userEmail: string;
  jwtPayload:
    | KC_OAUTH_PROPS
    | GOOGLE_OAUTH_PROPS
    | MICROSOFT_OAUTH_PROPS
    | null;
};

export type OnLoginListener = (success: boolean, message?: string) => void;
export type OnLogoutListener = () => void;

class AuthManager {
  private provider: SSOProvider = "";
  private authResult: AuthSession.TokenResponse | null = null;
  private jwtPayload: any = null;
  private loading = true;
  private isAuthenticated = false;
  private userEmail = "";

  private accessToken: string | null = null; // now generic
  private idToken: string | null = null;

  private loginListeners = new Map<string, OnLoginListener>();
  private logoutListeners = new Set<OnLogoutListener>();

  private KC_REDIRECT = makeRedirectUri({
    scheme: "http://localhost:8081",
  });

  constructor() {
    WebBrowser.maybeCompleteAuthSession();
  }

  /** On app start, restore session if possible */
  async initialize() {
    // 1) Try to load provider + tokens from storage
    const [storedProvider, storedRefresh, storedId] = await Promise.all([
      getProvider(),
      getRefreshToken(),
      getIdToken(),
    ]);

    console.log("Auth Init: ", storedProvider, storedRefresh, storedId);

    // 2) If we have an un-expired ID token, just restore from that
    if (storedId && storedProvider) {
      const now = Date.now() / 1000;
      const payload = jwtDecode<{ exp: number }>(storedId);
      if (payload.exp > now) {
        // still valid
        this.provider = storedProvider as SSOProvider;
        this.idToken = storedId;
        this.accessToken = await getAccessToken();
        this.jwtPayload = jwtDecode(storedId);
        this.userEmail =
          (this.jwtPayload as any).email ??
          (this.jwtPayload as KC_OAUTH_PROPS).preferred_username;
        this.isAuthenticated = true;
        this.notifyLogin(true);
        this.loading = false;
        return;
      }
      // expired → fall through to refresh
    }

    // 3) Otherwise, if we have a refreshToken, do a PKCE refresh with Keycloak
    if (storedRefresh) {
      this.provider = "KC"; // always broker through Keycloak
      try {
        const result = await AuthSession.refreshAsync(
          { clientId: oidcConfig.clientId, refreshToken: storedRefresh },
          {
            tokenEndpoint: `${oidcConfig.issuer}/protocol/openid-connect/token`,
          }
        );
        this.applyTokenResult(result, this.provider);
        this.notifyLogin(true);
      } catch {
        await removeRefreshToken();
        this.clearAuth();
        this.notifyLogin(false, "refresh failed");
      }
    }

    this.loading = false;
  }

  /** KC native PKCE flow  */
  async loginKC() {
    this.provider = "KC";
    const disco = await AuthSession.fetchDiscoveryAsync(oidcConfig.issuer);
    const req = new AuthSession.AuthRequest({
      clientId: oidcConfig.userClientId,
      redirectUri: this.KC_REDIRECT,
      responseType: AuthSession.ResponseType.Code,
      scopes: oidcConfig.userScopes,
      usePKCE: true,
    });

    const res = await req.promptAsync(disco);
    if (res.type === "success" && res.params.code) {
      const tok = await AuthSession.exchangeCodeAsync(
        {
          clientId: oidcConfig.userClientId,
          code: res.params.code,
          redirectUri: this.KC_REDIRECT,
          extraParams: { code_verifier: req.codeVerifier! },
        },
        { tokenEndpoint: disco.tokenEndpoint }
      );
      this.applyTokenResult(tok, "KC");
      this.notifyLogin(true);
    } else {
      this.notifyLogin(false, `loginKC: ${res.type}`);
    }
  }

  /** Google via Keycloak broker */
  async loginGoogle() {
    await this._oidcLogin("GOOGLE", { kc_idp_hint: "google" });
  }

  /** Microsoft via Keycloak broker */
  async loginMicrosoft() {
    await this._oidcLogin("MICROSOFT", { kc_idp_hint: "microsoft" });
  }

  /** Common brokered login helper */
  private async _oidcLogin(
    provider: SSOProvider,
    extraParams: Record<string, string>
  ) {
    this.provider = provider;
    const disco = await AuthSession.fetchDiscoveryAsync(oidcConfig.issuer);
    const req = new AuthSession.AuthRequest({
      clientId: oidcConfig.userClientId,
      redirectUri: this.KC_REDIRECT,
      responseType: AuthSession.ResponseType.Code,
      scopes: oidcConfig.userScopes,
      usePKCE: true,
      extraParams,
    });

    const res = await req.promptAsync(disco);
    if (res.type === "success" && res.params.code) {
      const tok = await AuthSession.exchangeCodeAsync(
        {
          clientId: oidcConfig.userClientId,
          code: res.params.code,
          redirectUri: this.KC_REDIRECT,
          extraParams: { code_verifier: req.codeVerifier! },
        },
        { tokenEndpoint: disco.tokenEndpoint }
      );
      this.applyTokenResult(tok, provider);
      this.notifyLogin(true);
    } else {
      this.notifyLogin(false, `login${provider}: ${res.type}`);
    }
  }

  /** Sign-out via OIDC end-session (clears Keycloak + IdP sessions) */
  async logout() {
    // revoke refresh token
    const refresh = await getRefreshToken();
    if (refresh) {
      try {
        await AuthSession.revokeAsync(
          { token: refresh, clientId: oidcConfig.userClientId },
          {
            revocationEndpoint: `${oidcConfig.issuer}/protocol/openid-connect/revoke`,
          }
        );
      } catch {}
    }

    // call OIDC logout to clear cookies / brokered IdP sessions
    if (this.idToken) {
      const params = new URLSearchParams({
        id_token_hint: this.idToken,
        post_logout_redirect_uri: this.KC_REDIRECT,
      });
      const logoutUrl =
        `${oidcConfig.issuer}/protocol/openid-connect/logout?` +
        params.toString();
      await WebBrowser.openAuthSessionAsync(logoutUrl, this.KC_REDIRECT);
    }

    // clear everything
    await Promise.all([
      removeRefreshToken(),
      removeAccessToken(),
      removeIdToken(),
      removeProvider(),
    ]);
    this.clearAuth();
    this.notifyLogout();
  }

  /** Get a snapshot for UI subscribers */
  getState(): AuthState {
    return {
      provider: this.provider,
      isAuthenticated: this.isAuthenticated,
      loading: this.loading,
      userEmail: this.userEmail,
      jwtPayload: this.jwtPayload,
    };
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  listenLogin(key: string, fn: OnLoginListener) {
    this.loginListeners.set(key, fn);
  }
  removeLogin(key: string) {
    this.loginListeners.delete(key);
  }
  listenLogout(fn: OnLogoutListener) {
    this.logoutListeners.add(fn);
  }
  removeLogout(fn: OnLogoutListener) {
    this.logoutListeners.delete(fn);
  }

  private notifyLogin(success: boolean, message?: string) {
    this.isAuthenticated = success;
    this.loading = false;
    for (const fn of this.loginListeners.values()) fn(success, message);
  }

  private notifyLogout() {
    this.isAuthenticated = false;
    this.provider = "";
    this.loading = false;
    for (const fn of this.logoutListeners) fn();
  }

  /** Common: store tokens + decode payload + persist everything */
  private applyTokenResult(
    result: AuthSession.TokenResponse,
    provider: SSOProvider
  ) {
    this.provider = provider;
    this.authResult = result;
    this.accessToken = result.accessToken;
    this.idToken = result.idToken ?? null;

    console.log("this.provider: ", this.provider);
    console.log("this.authResult: ", this.authResult);
    console.log("this.accessToken: ", this.accessToken);
    console.log("this.idToken: ", this.idToken);

    // decode the Keycloak‐issued JWT
    this.jwtPayload = jwtDecode<any>(this.idToken!);
    this.userEmail =
      (this.jwtPayload as any).email ??
      (this.jwtPayload as KC_OAUTH_PROPS).preferred_username;

    this.isAuthenticated = true;

    // persist all tokens + provider
    setRefreshToken(result.refreshToken);
    setAccessToken(result.accessToken!);
    setIdToken(result.idToken!);
    setProvider(provider);
  }

  private clearAuth() {
    this.provider = "";
    this.authResult = null;
    this.jwtPayload = null;
    this.userEmail = "";
    this.accessToken = null;
    this.idToken = null;
    this.isAuthenticated = false;
  }
}

export const authManager = new AuthManager();
