// components/ShareChatModal.tsx
import React, { FC, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Clipboard, // if you’re on RN >=0.60, use '@react-native-clipboard/clipboard'
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const MAX_WIDTH = Math.min(width * 0.9, 400);

type ShareChatModalProps = {
  chatId: string;
  visible: boolean;
  onClose: () => void;
};

const ShareChatModal: FC<ShareChatModalProps> = ({
  chatId,
  visible,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const url = `http://localhost:8081/ChatScreen?chatId=${chatId}`;

  const handleCopy = () => {
    if (Platform.OS === "web") {
      navigator.clipboard.writeText(url);
    } else {
      Clipboard.setString(url);
    }
    setCopied(true);
    setTimeout(() => {
      onClose();
      setCopied(false);
    }, 800);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={24} color="#444" />
          </TouchableOpacity>

          <Text style={styles.title}>Share this Chat</Text>
          <Text style={styles.subtitle}>Copy the link below to share:</Text>

          <View style={styles.urlContainer}>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={styles.urlText}
            >
              {url}
            </Text>
          </View>

          <TouchableOpacity
            style={{ width: "100%", marginTop: 20 }}
            activeOpacity={0.8}
            onPress={handleCopy}
          >
            <LinearGradient
              colors={copied ? ["#4caf50", "#388e3c"] : ["#42a5f5", "#1e88e5"]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.copyButton}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={20}
                color="#fff"
              />
              <Text style={styles.copyText}>
                {copied ? "Copied!" : "Copy URL"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: MAX_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    position: "relative",
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
    textAlign: "center",
  },
  urlContainer: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  urlText: {
    fontSize: 14,
    color: "#333",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 24,
  },
  copyText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ShareChatModal;
