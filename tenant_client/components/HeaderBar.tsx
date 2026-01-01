// components/HeaderBar.tsx
import React, { FC, ReactNode } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

type HeaderBarProps = {
  /** Optional title text centered in the header */
  title?: string;
  /** Override the default Home button handler */
  onHomePress?: () => void;
  /** Optional element to render on the right side (e.g. settings icon) */
  rightComponent?: ReactNode;
};

const HeaderBar: FC<HeaderBarProps> = ({
  title,
  onHomePress,
  rightComponent,
}) => {
  const router = useRouter();
  const handleHome = () => {
    if (onHomePress) return onHomePress();
    // default: navigate to your home tab
    router.push({ pathname: "/" });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={handleHome} style={styles.homeBtn}>
          <Text style={styles.homeText}>🏰 Home</Text>
        </TouchableOpacity>

        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.right}>
          {rightComponent || <View style={styles.spacer} />}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#0c0a09",
  },
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  homeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1c1917",
    borderRadius: 20,
  },
  homeText: {
    color: "#fff",
    fontSize: 18,
    textAlignVertical: "center",
    fontWeight: 600,
    fontFamily: "roboto",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  spacer: {
    width: 60, // same width as homeBtn to center title
  },
  right: {
    minWidth: 60,
    alignItems: "flex-end",
  },
});

export default HeaderBar;
