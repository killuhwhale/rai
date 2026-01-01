// components/LanguagePicker.tsx
import React, { FC, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

export type Language = {
  label: string;
  value: string;
  flag: string;
};

const LANGUAGES: Language[] = [
  { label: "English", value: "en", flag: "🇺🇸" },
  { label: "Spanish", value: "es", flag: "🇪🇸" },
  { label: "French", value: "fr", flag: "🇫🇷" },
  { label: "Hindi", value: "hi", flag: "🇮🇳" },
  { label: "Bengali", value: "bn", flag: "🇧🇩" },
  { label: "Chinese", value: "zh", flag: "🇨🇳" },

  { label: "Portuguese", value: "pt", flag: "🇵🇹" },
  { label: "Russian", value: "ru", flag: "🇷🇺" },
  { label: "Japanese", value: "ja", flag: "🇯🇵" },
];

type LanguagePickerProps = {
  selectedValue: string;
  onLangChange: (newLang: "en" | "es") => Promise<void>;
};

const LanguagePicker: FC<LanguagePickerProps> = ({
  selectedValue,
  onLangChange,
}) => {
  const [open, setOpen] = useState(false);
  const current =
    LANGUAGES.find((l) => l.value === selectedValue) || LANGUAGES[0];

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.flag}>{current.flag}</Text>
        <Text style={styles.label}>{current.label}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      item.value === selectedValue && styles.optionSelected,
                    ]}
                    onPress={() => {
                      onLangChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    flex: 1,
    marginRight: 4,
  },
  caret: {
    fontSize: 14,
    color: "#666",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: width * 0.8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 12,
    maxHeight: "60%",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionSelected: {
    backgroundColor: "#E0F2FF",
  },
  optionLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
});

export default LanguagePicker;
