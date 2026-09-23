import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during server render and before hydration. Client-handled forms stay disabled until
// then, so an early click can never fall back to a native GET that puts credentials in the URL.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
