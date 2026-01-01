// components/SignOutButton.tsx
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function SignOutButton({ onPress, style, textStyle }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.button, style]}
    >
      <MaterialIcons name="logout" size={20} color="#fff" style={styles.icon} />
      <Text style={[styles.text, textStyle]}>Sign Out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53E3E", // warm red
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 8,
    // shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // elevation for Android
    elevation: 3,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
