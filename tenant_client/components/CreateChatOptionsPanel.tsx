import React, { FC, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";

const { width, height } = Dimensions.get("window");

type CreateChatOptionsPanelProps = {
  visible: boolean;
  onCreateNow: () => void;
  onCreateLater: () => void;
  onCancel: () => void;
};

const CreateChatOptionsPanel: FC<CreateChatOptionsPanelProps> = ({
  visible,
  onCreateNow,
  onCreateLater,
  onCancel,
}) => {
  // start off-screen above
  const translateY = useRef(new Animated.Value(-height)).current;

  useEffect(() => {
    if (visible) {
      // reset position
      translateY.setValue(-height);
      // animate down into center
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
          <Text style={styles.title}>New Chat Options</Text>

          <TouchableOpacity style={styles.optionBtn} onPress={onCreateNow}>
            <Text style={styles.optionText}>🟢 Create Now</Text>
            <Text style={styles.optionSub}>Start immediately</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={onCreateLater}>
            <Text style={styles.optionText}>🕒 Create for Later</Text>
            <Text style={styles.optionSub}>Add to list without opening</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, styles.cancelBtn]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
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
  panel: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  optionBtn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  cancelBtn: {
    borderBottomWidth: 0,
    marginTop: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    color: "#f66",
  },
});

export default CreateChatOptionsPanel;
