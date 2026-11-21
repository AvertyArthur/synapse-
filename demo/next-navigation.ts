import { useSyncExternalStore } from "react";
import { getLocation, navigate, subscribe } from "./router";

function useLoc() {
  return useSyncExternalStore(subscribe, getLocation, getLocation);
}

export function usePathname() {
  return useLoc().path;
}

export function useSearchParams() {
  return new URLSearchParams(useLoc().search);
}

export function useParams<T extends Record<string, string>>(): T {
  const m = /^\/cours\/([^/]+)$/.exec(useLoc().path);
  return (m ? { id: decodeURIComponent(m[1]) } : {}) as unknown as T;
}

export function useRouter() {
  return { push: navigate, replace: navigate, back: () => navigate("/") };
}
