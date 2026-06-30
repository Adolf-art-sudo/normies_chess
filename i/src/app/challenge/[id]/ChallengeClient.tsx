"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/components/auth-client";

// Priority order for assigning OWNED nfts to the most valuable slots first.
// King first, then Queen, then Rooks, Bishops, Knights, then Pawns.
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
    id = Math.floor(Math.random() * 10000); // 0–9999, matches parseIds() range
  } while (exclude.has(id));
  return id;
}

// Builds the final 16 ids: owned tokens fill the most valuable slots first,
// any remaining slots are filled with random (non-owned, "borrowed") ids.
function buildAutoFillIds(ownedIds: number[]) {
  const used = new Set<number>();
  const assigned: { slot: string; id: number; owned: boolean }[] = [];

  const owned = [...ownedIds];
  for (let i = 0; i < PIECE_PRIORITY.length; i++) {
    const slot = PIECE_PRIORITY[i];
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

export function ChallengeClient({ id }: { id: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Record<string, string> | null>(null);
  const [mode, setMode] = useState<"manual" | "random">("manual");
  const [ids, setIds] = useState("");
  const [address, setAddress] = useState("");
  const [assigned, setAssigned] = useState<{ slot: string; id: number; owned: boolean }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetch(`/api/challenges/${id}`)
      .then((res) => res.json())
      .then(setChallenge);
  }, [id]);

  async function fetchRandom() {
    if (!address.trim()) {
      setMessage("Enter your wallet address first.");
      return;
    }
    setFetching(true);
    setMessage("");
    try {
      const res = await fetch(`/api/normies/holder/${address.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch your Normies.");
      const ownedIds: number[] = data.tokenIds || [];
      const result = buildAutoFillIds(ownedIds);
      setAssigned(result);
      setIds(result.map((r) => r.id).join(", "));
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      const normieIds = parseIds(ids);
      // In manual mode we don't track which ids are "owned" vs "random" —
      // the backend will verify ownership of every id as before.
      // In auto-fill mode, only ids we explicitly marked as owned are
      // asserted as owned; the rest are submitted as unverified/"borrowed"
      // pieces so a user with fewer than 16 Normies can still play.
      const ownedIds =
        mode === "random" ? assigned.filter((a) => a.owned).map((a) => a.id) : normieIds;

      const res = await apiFetch(`/api/challenges/${id}/accept`, {
        method: "POST",
        body: JSON.stringify({ normieIds, ownedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not accept challenge.");
      router.push(`/game/${data.gameId}`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack" style={{ padding: 16, maxWidth: 760 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Accept challenge</h1>
      {challenge ? (
        <div className="stack">
          <div className="tiny">Challenger</div>
          <strong>{challenge.challenger_address}</strong>
          <div>{challenge.message}</div>

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

          {mode === "manual" ? (
            <label className="stack">
              <span className="tiny">Your 16 Normie IDs</span>
              <textarea className="field" rows={5} value={ids} onChange={(e) => setIds(e.target.value)} />
            </label>
          ) : (
            <div className="stack">
              <label className="stack">
                <span className="tiny">Your wallet address</span>
                <input
                  className="field"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                />
              </label>
              <button className="btn" onClick={fetchRandom} disabled={fetching}>
                {fetching ? "Fetching..." : "Fetch and assign"}
              </button>
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
              ) : null}
            </div>
          )}

          <button className="btn" onClick={accept} disabled={busy || parseIds(ids).length !== 16}>
            Accept and create game
          </button>
          {message ? <div className="tiny">{message}</div> : null}
        </div>
      ) : (
        <div className="tiny">Loading challenge...</div>
      )}
    </section>
  );
}