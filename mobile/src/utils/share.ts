import { Platform, Share } from 'react-native';

/**
 * Shares text through the system share sheet, or copies it where there isn't one (most desktop
 * browsers). Returns what happened so the caller can say so.
 */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      const result = await Share.share({ message });
      return result.action === Share.dismissedAction ? 'failed' : 'shared';
    }
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      await nav.share({ text: message });
      return 'shared';
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(message);
      return 'copied';
    }
  } catch {
    // Dismissing the share sheet rejects on some platforms.
  }
  return 'failed';
}
