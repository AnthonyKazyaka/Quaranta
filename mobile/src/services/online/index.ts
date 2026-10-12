import { MockOnlineService } from './mockOnlineService';
import { OnlineService } from './types';

export * from './types';
export { MockOnlineService } from './mockOnlineService';
export type { MockDebugControls, MockOptions } from './mockOnlineService';

let service: OnlineService | null = null;

/**
 * The online backend. For now that's the in-device mock; the Firebase implementation will be
 * chosen here once it exists (and Firebase is configured), falling back to the mock for demos.
 */
export function getOnlineService(): OnlineService {
  service ??= new MockOnlineService();
  return service;
}

/** Swaps the backend, for tests. */
export function setOnlineService(next: OnlineService | null) {
  service = next;
}

/** The demo controls, when the backend is the mock. */
export function getMockControls() {
  const current = getOnlineService();
  return current instanceof MockOnlineService ? current.debug : null;
}
