import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme';

/** Shows in-app notifications at the top of every screen. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;

  return (
    <SafeAreaView style={styles.host} pointerEvents="box-none" edges={['top']}>
      {toasts.map((toast) => (
        <View key={toast.id} style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.text}>{toast.text}</Text>
          {toast.actionLabel && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dismiss(toast.id);
                toast.onAction?.();
              }}
              style={styles.action}
            >
              <Text style={styles.actionText}>{toast.actionLabel}</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => dismiss(toast.id)}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.feltDark,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 520,
    width: '100%',
  },
  text: { color: colors.text, fontSize: 14, flex: 1 },
  action: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  actionText: { color: colors.feltDark, fontWeight: '800', fontSize: 13 },
  close: { color: colors.textMuted, fontSize: 14, padding: spacing.xs },
});
