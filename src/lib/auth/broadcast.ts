/** Notify every `useAuthSession` hook to re-fetch after login or logout. */
export function broadcastAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("razorflow:auth-changed"));
}
