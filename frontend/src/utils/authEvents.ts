/**
 * Event bus for auth events outside the React tree.
 * Allows api.ts to signal session expiry without window.location.href.
 */
export const authEvents = new EventTarget();

export const SESSION_EXPIRED_EVENT = 'session-expired';

export function emitSessionExpired(): void {
  authEvents.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
