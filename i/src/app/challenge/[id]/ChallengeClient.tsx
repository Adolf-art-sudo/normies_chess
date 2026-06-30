"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/components/auth-client";

function parseIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id >= 0 && id <= 9999)
    .slice(0, 16);
}

export function ChallengeClient({ id }: { id: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Record<string, string> | null>(null);
  const [ids, setIds] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/challenges/${id}`)
      .then((res) => res.json())
      .then(setChallenge);
  }, [id]);

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/challenges/${id}/accept`, {
        method: "POST",
        body: JSON.stringify({ normieIds: parseIds(ids) })
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
          <label className="stack">
            <span className="tiny">Your 16 Normie IDs</span>
            <textarea className="field" rows={5} value={ids} onChange={(e) => setIds(e.target.value)} />
          </label>
          <button className="btn" onClick={accept} disabled={busy}>Accept and create game</button>
          {message ? <div className="tiny">{message}</div> : null}
        </div>
      ) : (
        <div className="tiny">Loading challenge...</div>
      )}
    </section>
  );
}
