import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ActionSheetOption {
  key: string;
  label: string;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function ActionSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: ActionSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white px-4 pb-8 pt-4">
          {title ? (
            <Text className="mb-2 px-2 text-sm font-semibold uppercase text-gray-400">
              {title}
            </Text>
          ) : null}

          {options.map((option) => (
            <Pressable
              key={option.key}
              className="flex-row items-center justify-between rounded-xl px-3 py-3.5 active:bg-gray-100"
              onPress={() => onSelect(option.key)}
            >
              <Text
                className={`text-base font-medium ${
                  option.destructive ? "text-red-600" : "text-gray-900"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            className="mt-2 flex-row items-center justify-center rounded-xl bg-gray-100 px-3 py-3.5 active:bg-gray-200"
            onPress={onClose}
          >
            <Ionicons name="close" size={18} color="#374151" />
            <Text className="ml-1.5 text-base font-medium text-gray-700">
              Cancelar
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
