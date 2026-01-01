import React, { PropsWithChildren, useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { authManager } from "@/constants/AuthManager";
import { useAuth } from "@/hooks/useAuth";

export default function AuthWrapper({ children }: PropsWithChildren<{}>) {
  const [initialized, setInitialized] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // 2) Subscribe to AuthManager events for any subsequent login/logout
  useEffect(() => {
    const onLogin = (success: boolean) => setLoggedIn(success);
    const onLogout = () => setLoggedIn(false);

    authManager.listenLogin("AuthWrapper", onLogin);
    authManager.listenLogout(onLogout);

    authManager.initialize().then(() => {
      // snapshot the state in case initialize() didn't trigger onLogin
      const { isAuthenticated } = authManager.getState();
      setLoggedIn(isAuthenticated);
      setInitialized(true);
    });

    return () => {
      authManager.removeLogin("AuthWrapper");
      authManager.removeLogout(onLogout);
    };
  }, []);

  //   3) While we haven’t yet determined the initial auth state, show a spinner
  if (!initialized) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 4) Split your two children: [ protectedStack, loginScreen ]
  const [ProtectedStack, PublicScreen] = React.Children.toArray(children);

  return (
    <View style={styles.container}>
      {loggedIn ? (
        <View style={styles.flex}>{ProtectedStack}</View>
      ) : (
        <View style={styles.flex}>{PublicScreen}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  spinnerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
