// app/index.tsx
import React, { FC, useCallback, useEffect, useState } from "react";
import {
  View,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";

import axios from "axios";
import ActionCancelModal from "@/components/ActionCancelModal";
import CreateChatOptionsPanel from "@/components/CreateChatOptionsPanel";
import ShareChatModal from "@/components/ShareChatModal";
import { useAuth } from "@/hooks/useAuth";
import SignOutButton from "@/components/SignOutButton";
import { authManager } from "@/constants/AuthManager";

type ChatListItemProps = {
  chatId: string;
  setDeleteChatId: React.Dispatch<React.SetStateAction<string>>;
  setShowDeleteChat: React.Dispatch<React.SetStateAction<boolean>>;
  onShareChatId: (chatId: any) => void;
};

const ChatListItem: FC<ChatListItemProps> = ({
  chatId,
  setDeleteChatId,
  setShowDeleteChat,
  onShareChatId,
}) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/ChatScreen",
          params: {
            chatId,
          },
        })
      }
    >
      <View style={styles.chatCardHeader}>
        <Text style={styles.chatTitle}>Chat {chatId}</Text>
        <TouchableOpacity
          onPress={() => {
            setDeleteChatId(chatId);
            setShowDeleteChat(true);
          }}
          style={styles.deleteIcon}
        >
          <Text style={styles.deleteIconText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chatCardHeader}>
        <Text style={styles.chatSubtitle}>{}timestamp</Text>
        <TouchableOpacity onPress={() => onShareChatId(chatId)}>
          <Text style={{ color: "red" }}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.chatSubtitleTS}>Tap to open conversation</Text>
    </TouchableOpacity>
  );
};

export default function Home() {
  const [chats, setChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanel] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareChatId, setShareChatId] = useState("");
  const router = useRouter();

  const currentState = authManager.getState();

  useEffect(() => {
    fetch("http://localhost:4000/chats")
      .then((res) => res.json())
      .then((data) => {
        console.log("Chats data: ", data);
        setChats(data.chats || []);
      })
      .catch((err) => {
        console.error("Error fetching chats", err);
        Alert.alert("Error", "Could not load chats");
      })
      .finally(() => setLoading(false));
  }, []);

  // Create & redirect
  const createNow = useCallback(async () => {
    try {
      const res = await axios.post<{ chatId: string }>(
        "http://localhost:4000/chats"
      );
      const { chatId } = res.data;
      setPanel(false);
      setChats((prev) => [chatId, ...prev]);
      router.push({
        pathname: "/(tabs)/ChatScreen",
        params: {
          chatId: chatId,
        },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not create chat");
    }
  }, []);

  // Create but stay on Home
  const createForLater = useCallback(async () => {
    try {
      const res = await axios.post<{ chatId: string }>(
        "http://localhost:4000/chats"
      );
      const { chatId } = res.data;
      setPanel(false);
      setChats((prev) => [chatId, ...prev]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not create chat");
    }
  }, []);

  const [showDeleteChat, setShowDeleteChat] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState("");

  const deleteChat = async () => {
    if (!deleteChatId)
      return console.log("No chat id given to delete: ", deleteChatId);
    try {
      await axios.delete(`http://localhost:4000/chats/${deleteChatId}`);
      setChats((cs) => cs.filter((id) => id !== deleteChatId));
    } catch (err) {
      console.error(`Failed to delete chat ${deleteChatId}`, err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          width: "100%",
          backgroundColor: "#F2F2F7",

          alignItems: "flex-end",
          justifyContent: "flex-end",
        }}
      >
        <View style={{ margin: 12 }}>
          <Button
            title="Configure Tenant"
            onPress={() => router.navigate("/AdminSetupScreen")}
          />
          <SignOutButton onPress={async () => await authManager.logout()} />
        </View>
      </View>
      <View style={{ width: "80%", backgroundColor: "#F2F2F7", flex: 1 }}>
        <Text style={{ marginTop: 24, fontSize: 0 }}>Dev Shim</Text>
        <Text
          style={{
            textAlign: "center",
            margin: 8,
            fontSize: 24,
            fontWeight: 800,
            color: "#F2F2F7",
          }}
        >
          Company Name {` - ${currentState.isAuthenticated}`}
          {` - ${currentState.userEmail}`}
        </Text>
        <View
          style={{
            backgroundColor: "#0c0a09",
          }}
        >
          <View
            style={{
              justifyContent: "flex-end",
              flexDirection: "row",
              marginHorizontal: 6,
            }}
          >
            <TouchableOpacity
              style={{
                padding: 10,
                backgroundColor: "#1c1917",
                borderRadius: 24,
              }}
              onPress={() => setPanel(true)}
            >
              <Text style={{}}>＋ New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(id) => id}
            renderItem={({ item }) => (
              <ChatListItem
                chatId={item}
                setDeleteChatId={setDeleteChatId}
                setShowDeleteChat={setShowDeleteChat}
                onShareChatId={(chatId) => {
                  setShareChatId(chatId);
                  setShareVisible(true);
                }}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No chats yet. Tap “＋” above to start one.
              </Text>
            }
            contentContainerStyle={
              chats.length === 0 ? styles.emptyContainer : { marginTop: 24 }
            }
          />
        )}
      </View>
      <ShareChatModal
        chatId={shareChatId}
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
      />
      <CreateChatOptionsPanel
        visible={panelVisible}
        onCreateNow={createNow}
        onCreateLater={createForLater}
        onCancel={() => setPanel(false)}
      />

      <ActionCancelModal
        message={`Delete chat? (${deleteChatId})`}
        onCancel={() => {
          setShowDeleteChat(false);
          setDeleteChatId("");
        }}
        onConfirm={() => {
          setShowDeleteChat(false);
          deleteChat();
        }}
        title=""
        visible={showDeleteChat}
        cancelText="Cancel"
        confirmText="Delete"
        key={"DleteChatModal"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  headerButtonText: {
    fontSize: 28,
    color: "#007AFF",
  },
  chatCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android elevation
    elevation: 3,
  },
  chatCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  deleteIcon: {
    padding: 4,
  },
  deleteIconText: {
    fontSize: 18,
  },
  chatSubtitle: {
    marginTop: 4,
    color: "#666",
  },
  chatSubtitleTS: {
    marginTop: 4,
    color: "#888",
  },
  sep: {
    height: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
  },
});
