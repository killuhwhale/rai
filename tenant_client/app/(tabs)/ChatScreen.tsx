// app/chat/[chatId].tsx
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import io, { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams } from "expo-router/build/hooks";

import RawMessage from "@/components/RawMessage";
import LanguagePicker from "@/components/LanguagePicker";
import MessageInput from "@/components/MessageInput";
import HeaderBar from "@/components/HeaderBar";

interface Message {
  messageId: string;
  user: string;
  originText: string;
  translatedText: string;
  originLang: string;
  targetLang: string;
  TS: string;
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const userIdRef = useRef<string>(crypto.randomUUID());

  if (!chatId) {
    return (
      <View
        style={{
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: 800, color: "red", fontSize: 22 }}>
          Chat ID not given
        </Text>
      </View>
    );
  }

  const [msgs, setMsgs] = useState<(RawMessageProps | LiveMessageProps)[]>([]);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<"en" | "es">("en");

  const socketRef = useRef<Socket>();
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const init = async () => {
      const saved = await AsyncStorage.getItem("language");
      const initialLang = (saved as "en" | "es") || "en";
      setLang(initialLang);

      const socket = io("http://localhost:4000");
      socketRef.current = socket;
      // tell server which chat and lang
      socket.emit("joinChat", {
        chatId,
        userId: userIdRef.current,
        lang: initialLang,
      });

      socket.on("historyStart", () => {
        setMsgs([]);
      });

      socket.on("message", (msg: Message) => {
        setMsgs((prev) => [...prev, msg]);
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    };
    init();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [chatId]);

  const onLangChange = async (newLang: "en" | "es") => {
    console.log("Setting new language: ", newLang);
    setLang(newLang);
    await AsyncStorage.setItem("language", newLang);
    socketRef.current?.emit("setLanguage", {
      userId: userIdRef.current,
      chatId,
      lang: newLang,
    });
  };

  const send = () => {
    if (!text.trim()) return;
    socketRef.current?.emit("sendMessage", { text });
    setText("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar />

      <View style={styles.pickerContainer}>
        <LanguagePicker selectedValue={lang} onLangChange={onLangChange} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 10 }}
      >
        {msgs.map((m, i) => {
          const key = m.messageId + i;
          console.log("Msg to show: ", m);

          return <RawMessage message={m as RawMessageProps} key={key} />;
        })}
      </ScrollView>

      {/* <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
        />
        <TouchableOpacity onPress={send} style={styles.button}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View> */}

      <MessageInput
        value={text}
        onChangeText={setText}
        onSend={send}
        maxLength={512}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F9F9F9",
  },
  pickerLabel: {
    fontSize: 16,
    marginRight: 10,
    color: "#333",
  },
  picker: { width: 150, marginLeft: 10 },
  messages: { flex: 1, backgroundColor: "#f5f5f5" },
  msgBlock: { marginBottom: 8 },
  msgMeta: { fontSize: 12, color: "#555" },
  msgText: { fontSize: 16 },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  button: {
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  buttonText: { color: "#fff" },
});
