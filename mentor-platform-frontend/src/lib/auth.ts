import { useSyncExternalStore } from "react";

export type DecodedToken = {
  sub?: string;
  role?: string;
  authorities?: string[] | string;
};

function normalizeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;

  if (padding === 0) {
    return normalized;
  }

  return normalized.padEnd(normalized.length + (4 - padding), "=");
}

export function readTokenPayload(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const decoded = atob(normalizeBase64(payload));
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

export function readEmailFromToken(token: string) {
  return readTokenPayload(token)?.sub ?? "";
}

export function readRoleFromToken(token: string) {
  const payload = readTokenPayload(token);

  if (!payload) {
    return "";
  }

  if (payload.role) {
    return payload.role;
  }

  if (Array.isArray(payload.authorities)) {
    return payload.authorities[0] ?? "";
  }

  if (typeof payload.authorities === "string") {
    return payload.authorities;
  }

  return "";
}

export function isMentorRole(role: string) {
  return role.toUpperCase().includes("MENTOR");
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("token") ?? "";
}

function subscribeToTokenStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "token") {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function useStoredToken() {
  return useSyncExternalStore(subscribeToTokenStore, getStoredToken, () => "");
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
}

export function createSessionId() {
  return Math.random().toString(36).substring(2, 8);
}
