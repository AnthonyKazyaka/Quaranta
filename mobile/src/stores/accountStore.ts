import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LinkedAccount, linkGoogleAccount } from '@/services/account';

interface AccountStore {
  linked: LinkedAccount | null;
  linking: boolean;
  /** Why the last attempt to link an account failed. */
  linkError: string | null;
  /** Show an in-app alert when it becomes your turn at a table you're not looking at. */
  turnAlerts: boolean;

  linkGoogle: () => Promise<void>;
  unlink: () => void;
  setTurnAlerts: (enabled: boolean) => void;
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      linked: null,
      linking: false,
      linkError: null,
      turnAlerts: true,

      linkGoogle: async () => {
        set({ linking: true, linkError: null });
        try {
          set({ linked: await linkGoogleAccount() });
        } catch {
          set({ linkError: "Couldn't link your Google account. Please try again." });
        } finally {
          set({ linking: false });
        }
      },
      unlink: () => set({ linked: null, linkError: null }),
      setTurnAlerts: (turnAlerts) => set({ turnAlerts }),
    }),
    {
      name: 'quaranta-account',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ linked: state.linked, turnAlerts: state.turnAlerts }),
    },
  ),
);
