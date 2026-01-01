import React, { useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/hooks/useAuth";
import { authManager } from "@/constants/AuthManager";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <GoogleOAuthProvider clientId="362579926755-hf2oosq0jl7o6j288m6ta9me41q6ivm7.apps.googleusercontent.com">
      <View style={styles.container}>
        <Text style={styles.title}>Please Sign In</Text>

        {/* Keycloak SSO */}
        <Button
          title="Sign in with Keycloak"
          onPress={async () => await authManager.loginKC()}
        />

        {/* Spacer */}
        <View style={{ height: 20 }} />

        {/* Google SSO (popup flow) */}
        <Button
          title="Sign in with Google"
          onPress={() => authManager.loginGoogle()}
        />

        <Button
          title="Sign in with Microsoft"
          onPress={() => authManager.loginMicrosoft()}
        />
      </View>
    </GoogleOAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 32,
  },
});
