// components/ToggleMessageItem.tsx
import React, { FC, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export type RawMessageProps = {
  messageId: string;
  originLang: string;
  originText: string;
  targetLang: string;
  translatedText: string;
  ts: string;
  user: string;
};

const RawMessage: FC<{ message: RawMessageProps }> = ({ message }) => {
  const { originLang, originText, targetLang, translatedText, ts, user } =
    message;

  // true = showing original, false = showing translated
  const [showOriginal, setShowOriginal] = useState(false);

  const timeLabel = new Date(ts).toLocaleTimeString();

  return (
    <View
      style={[styles.container, showOriginal ? styles.ogBg : styles.transBg]}
    >
      {/* Header: user, time, lang tag, and a toggle button */}
      <View style={styles.header}>
        <Text style={styles.meta}>
          {user} @ {timeLabel} · ({showOriginal ? originLang : targetLang})
        </Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setShowOriginal((v) => !v)}
        >
          <Text style={styles.toggleText}>
            {showOriginal ? "Show ↪︎ Trans" : "Show ↪︎ OG"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* The message body */}
      <Text style={styles.body}>
        {showOriginal ? originText : translatedText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  ogBg: {
    backgroundColor: "#E8F5E9", // light green for original
  },
  transBg: {
    backgroundColor: "#1c1917", // light blue for translated
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: "#555",
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#1c1917",
  },
  toggleText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  body: {
    fontSize: 16,
    color: "#222",
    lineHeight: 22,
  },
});

export default RawMessage;
