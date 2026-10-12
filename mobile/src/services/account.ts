/**
 * Linking the anonymous account to a Google account so online games follow the player across
 * devices. This is a stand-in: it pretends to sign in. The real version will call Firebase Auth's
 * `linkWithCredential` and live next to the other Firebase code in this folder.
 */
export interface LinkedAccount {
  provider: 'google';
  displayName: string;
}

export async function linkGoogleAccount(): Promise<LinkedAccount> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { provider: 'google', displayName: 'Google account (demo)' };
}
