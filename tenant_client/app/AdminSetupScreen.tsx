import { authManager } from "@/constants/AuthManager";
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";

type IdPConfig = {
  realm: string;
  alias: string;
  issuer: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  logoutUrl: string;
  clientId: string;
  clientSecret: string;
};

/**
 *
 * Field	Value
  Realm	dev-realm
  IdP Alias	dev-oidc
  Issuer URL	https://reptrackrr.com/keycloak/auth/realms/dev-realm
  Authorization	https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/auth
  Token URL	https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/token
  UserInfo URL	https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/userinfo
  Logout URL	https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/logout
  Client ID	dev-oidc-client
  Client Secret	<paste the secret you copied>
 *
 */

export default function AdminSetupScreen() {
  const [config, setConfig] = useState<IdPConfig>({
    realm: "company-a-realm",
    alias: "dev-oidc",
    issuer: "https://reptrackrr.com/keycloak/auth/realms/dev-realm",
    authorizationUrl:
      "https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/auth",
    tokenUrl:
      "https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/token",
    userInfoUrl:
      "https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/userinfo",
    logoutUrl:
      "https://reptrackrr.com/keycloak/auth/realms/dev-realm/protocol/openid-connect/logout",
    clientId: "dev-oidc-client",
    clientSecret: "HNgir6ykXQnrFYMTRWgemQGcF98jSNja",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof IdPConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const missing = (Object.entries(config) as [keyof IdPConfig, string][])
      .filter(([, v]) => !v.trim())
      .map(([k]) => k);
    if (missing.length) {
      Alert.alert("Missing Fields", `Please fill in: ${missing.join(", ")}`);
      return;
    }

    const token = authManager.getAccessToken();
    if (!token) {
      Alert.alert("Error", "Not signed in");
      return;
    }

    console.log("Using access token: ", token);

    setLoading(true);
    try {
      const resp = await fetch("http://localhost:4000/kcadmin/setup-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          realm: config.realm,
          idpConfig: {
            alias: config.alias,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            issuer: config.issuer,
            authorizationUrl: config.authorizationUrl,
            tokenUrl: config.tokenUrl,
            userInfoUrl: config.userInfoUrl,
            logoutUrl: config.logoutUrl,
          },
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      Alert.alert("Success", `Realm "${config.realm}" configured!`);
      // Optionally reset form or navigate away...
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to configure realm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Onboard New Tenant</Text>

      {(
        [
          { label: "Realm Name", key: "realm" as const },
          { label: "IdP Alias", key: "alias" as const },
          { label: "Issuer URL", key: "issuer" as const },
          { label: "Authorization URL", key: "authorizationUrl" as const },
          { label: "Token URL", key: "tokenUrl" as const },
          { label: "UserInfo URL", key: "userInfoUrl" as const },
          { label: "Logout URL", key: "logoutUrl" as const },
          { label: "Client ID", key: "clientId" as const },
          { label: "Client Secret", key: "clientSecret" as const },
        ] as const
      ).map(({ label, key }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={config[key]}
            onChangeText={(text) => handleChange(key, text)}
            autoCapitalize="none"
            secureTextEntry={key === "clientSecret"}
          />
        </View>
      ))}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <Button title="Create Tenant Realm" onPress={handleSubmit} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 4,
    padding: 8,
  },
  loading: {
    marginTop: 12,
  },
});
