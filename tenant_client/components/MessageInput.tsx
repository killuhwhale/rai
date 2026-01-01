// components/MessageInput.tsx
import React, { FC } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type MessageInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  maxLength?: number;
};

const MessageInput: FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  maxLength,
}) => {
  const enabled = value.trim().length > 0;
  const countLabel = maxLength
    ? `${value.length} / ${maxLength}`
    : `${value.length} chars`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        {/* Left side: input + counter */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#999"
            value={value}
            onChangeText={(text) =>
              maxLength
                ? onChangeText(text.slice(0, maxLength))
                : onChangeText(text)
            }
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{countLabel}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSend}
          disabled={!enabled}
        >
          <LinearGradient
            colors={
              enabled ? ["#4c669f", "#3b5998", "#192f6a"] : ["#ccc", "#bbb"]
            }
            start={[0, 0]}
            end={[1, 1]}
            style={[styles.sendButton, !enabled && styles.disabled]}
          >
            <MaterialCommunityIcons name="send" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
  charCount: {
    position: "absolute",
    bottom: 8,
    right: 16,
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  inputWrapper: {
    flex: 1,
    marginRight: 12,
    position: "relative",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    marginRight: 12,
    maxHeight: 120, // cap at ~5 lines
    // subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
});

export default MessageInput;
