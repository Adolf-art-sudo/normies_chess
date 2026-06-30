"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredSession, type Session } from "@/components/auth-client";

type Props = {
  onGameCreated: (gameId: string) => void;
};

function parseIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id >= 0 && id <= 9999)
    .slice(0, 16);
}

export function PlayerSetup({ onGameCreated }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [whiteIds, setWhiteIds] = useState("");
  const [blackIds, setBlackIds] = useState("");
  const [blackAddress, setBlackAddress] = useState("");
  const [holdings, setHoldings] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    const handler = (event: Event) => setSession((event as CustomEvent<Session>).detail);
    window.addEventListener("normies-session", handler);
    return () => window.removeEventListener("normies-session", handler);
  }, []);

  async function loadHoldings() {
    if (!session) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/normies/holder/${session.address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load holdings.");
      setHoldings(data.tokenIds || []);
      setWhiteIds((data.tokenIds || []).slice(0, 16).join(", "));
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createGame() {
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch("/api/games/create", {
        method: "POST",
        body: JSON.stringify({
          blackAddress,
          whiteNormieIds: parseIds(whiteIds),
          blackNormieIds: parseIds(blackIds),
          verifyOwnership: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create game.");
      onGameCreated(data.gameId);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createChallenge() {
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch("/api/challenges/create", {
        method: "POST",
        body: JSON.stringify({ normieIds: parseIds(whiteIds), message: "Open Normies Chess challenge" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create challenge.");
      setMessage(`Challenge ready: ${data.shareUrl}`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack" style={{ padding: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Battle setup</h1>
        <p className="tiny">Sign in, load your Normies, enter exactly 16 IDs per side, then start or post a challenge.</p>
      </div>
      <button className="btn secondary" onClick={loadHoldings} disabled={!session || busy}>
        Load my Normies
      </button>
      {holdings.length ? <div className="tiny">{holdings.length} holder tokens loaded. First 16 filled in.</div> : null}
      <label className="stack">
        <span className="tiny">Your 16 Normie IDs</span>
        <textarea className="field" rows={4} value={whiteIds} onChange={(e) => setWhiteIds(e.target.value)} />
      </label>
      <label className="stack">
        <span className="tiny">Opponent wallet</span>
        <input className="field" value={blackAddress} onChange={(e) => setBlackAddress(e.target.value)} placeholder="0x..." />
      </label>
      <label className="stack">
        <span className="tiny">Opponent 16 Normie IDs</span>
        <textarea className="field" rows={4} value={blackIds} onChange={(e) => setBlackIds(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn" onClick={createGame} disabled={!session || busy}>Start battle</button>
        <button className="btn secondary" onClick={createChallenge} disabled={!session || busy}>Create challenge</button>
      </div>
      {message ? <div className="tiny">{message}</div> : null}
    </section>
  );
}
