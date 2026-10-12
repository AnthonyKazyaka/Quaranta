import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light haptic cues on phones. The web gets none: vibration there feels like an error. */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const feedback = {
  tap: () => {
    if (enabled) void Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warn: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
