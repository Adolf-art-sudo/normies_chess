"use client";

import { SiweMessage } from "siwe";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export type Session = {
  address: string;
  sessionToken: string;
};

const storageKey = "normies-chess-session";

export function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(storageKey);
  else window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export async function signInWithEthereum() {
  if (!window.ethereum) throw new Error("No Ethereum wallet detected.");
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  const nonceRes = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  if (!nonceRes.ok) throw new Error("Could not create SIWE nonce.");
  const { nonce, domain } = await nonceRes.json();
  const chainHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  const chainId = Number.parseInt(chainHex, 16) || 1;
  const message = new SiweMessage({
    domain,
    address,
    statement: "Sign in to Normies Chess. No gas, no transaction.",
    uri: window.location.origin,
    version: "1",
    chainId,
    nonce
  }).prepareMessage();
  const signature = (await window.ethereum.request({
    method: "personal_sign",
    params: [message, address]
  })) as string;
  const verify = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature })
  });
  if (!verify.ok) throw new Error((await verify.json()).error || "Signature verification failed.");
  const session = (await verify.json()) as Session;
  storeSession(session);
  window.dispatchEvent(new CustomEvent("normies-session", { detail: session }));
  return session;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const session = getStoredSession();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.sessionToken ? { "x-session-token": session.sessionToken } : {}),
      ...(init.headers || {})
    }
  });
}
