"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredSession, type Session } from "@/components/auth-client";

type Props = {
  onGameCreated: (gameId: string) => void;
};

const PIECE_PRIORITY = [
  "King",
  "Queen",
  "Rook 1",
  "Rook 2",
  "Bishop 1",
  "Bishop 2",
  "Knight 1",
  "Knight 2",
  "Pawn 1",
  "Pawn 2",
  "Pawn 3",
  "Pawn 4",
  "Pawn 5",
  "Pawn 6",
  "Pawn 7",
  "Pawn 8"
];

function parseIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id >= 0 && id <= 9999)
    .slice(0, 16);
}

function randomId(exclude: Set<number>) {
  let id: number;
  do {
    id = Math.floor(Math.random() * 10000);
  } while (exclude.has(id));
  return id;
}

function buildAutoFillIds(ownedIds: number[]) {
  const used = new Set<number>();
  const assigned: { slot: string; id: number; owned: boolean }[] = [];
  const owned = [...ownedIds];
  for (const slot of PIECE_PRIORITY) {
    if (owned.length > 0) {
      const id = owned.shift() as number;
      used.add(id);
      assigned.push({ slot, id, owned: true });
    } else {
      const id = randomId(used);
      used.add(id);
      assigned.push({ slot, id, owned: false });
    }
  }
  return assigned;
}

export function PlayerSetup({ onGameCreated }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"manual" | "random">("manual");
  const [whiteIds, setWhiteIds] = useState("");
  const [blackIds, setBlackIds] = useState("");
  const [blackAddress, setBlackAddress] = useState("");
  const [holdings, setHoldings] = useState<number[]>([]);
  const [assigned, setAssigned] = useState<{ slot: string; id: number; owned: boolean }[]>([]);
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
      const ownedIds: number[] = data.tokenIds || [];
      setHoldings(ownedIds);
      if (mode === "manual") {
        setWhiteIds(ownedIds.slice(0, 16).join(", "));
      } else {
        const result = buildAutoFillIds(ownedIds);
        setAssigned(result);
        setWhiteIds(result.map((r) => r.id).join(", "));
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function ownedIdsForSubmit() {
    // Manual mode (or no auto-fill run yet): treat everything typed as a
    // claimed-owned id, same as before. Auto-fill mode: only assert
    // ownership for ids we actually pulled from holdings; the rest are
    // submitted as unverified "borrowed" pieces.
    if (mode === "random" && assigned.length) {
      return assigned.filter((a) => a.owned).map((a) => a.id);
    }
    return parseIds(whiteIds);
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
          whiteOwnedIds: ownedIdsForSubmit(),
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
        body: JSON.stringify({
          normieIds: parseIds(whiteIds),
          ownedIds: ownedIdsForSubmit(),
          message: "Open Normies Chess challenge"
        })
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

      <div className="split" style={{ gap: 8 }}>
        <button
          className="btn"
          style={{ opacity: mode === "manual" ? 1 : 0.5 }}
          onClick={() => setMode("manual")}
        >
          Enter IDs manually
        </button>
        <button
          className="btn"
          style={{ opacity: mode === "random" ? 1 : 0.5 }}
          onClick={() => setMode("random")}
        >
          Auto-fill (random fetch)
        </button>
      </div>

      <button className="btn secondary" onClick={loadHoldings} disabled={!session || busy}>
        {mode === "random" ? "Fetch and assign my Normies" : "Load my Normies"}
      </button>
      {mode === "manual" && holdings.length ? (
        <div className="tiny">{holdings.length} holder tokens loaded. First 16 filled in.</div>
      ) : null}

      {mode === "manual" ? (
        <label className="stack">
          <span className="tiny">Your 16 Normie IDs</span>
          <textarea className="field" rows={4} value={whiteIds} onChange={(e) => setWhiteIds(e.target.value)} />
        </label>
      ) : (
        <div className="stack">
          {assigned.length > 0 ? (
            <div className="stack" style={{ gap: 2 }}>
              {assigned.map((a) => (
                <div key={a.slot} className="tiny split">
                  <span>{a.slot}</span>
                  <span>
                    #{a.id} {a.owned ? "(owned)" : "(random)"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tiny">Click &quot;Fetch and assign my Normies&quot; to auto-build your 16 pieces.</div>
          )}
        </div>
      )}

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