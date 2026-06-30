"use client";

import { useEffect, useState } from "react";
import { getStoredSession, signInWithEthereum, storeSession, type Session } from "@/components/auth-client";

export function SignInButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(getStoredSession());
    const handler = (event: Event) => setSession((event as CustomEvent<Session>).detail);
    window.addEventListener("normies-session", handler);
    return () => window.removeEventListener("normies-session", handler);
  }, []);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      setSession(await signInWithEthereum());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const current = getStoredSession();
    if (current) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-session-token": current.sessionToken }
      });
    }
    storeSession(null);
    setSession(null);
  }

  if (session) {
    return (
      <div className="row">
        <span className="tiny">{session.address.slice(0, 6)}...{session.address.slice(-4)}</span>
        <button className="btn secondary" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ alignItems: "end" }}>
      <button className="btn" onClick={signIn} disabled={busy}>{busy ? "Signing..." : "Sign in"}</button>
      {error ? <div className="tiny" role="alert">{error}</div> : null}
    </div>
  );
}
