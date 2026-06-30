"use client";

import type { GameState } from "@/lib/chess-game";
import { apiFetch } from "@/components/auth-client";

type Props = {
  state: GameState | null;
  gameId: string | null;
  onRefresh: () => Promise<void>;
};

export function GamePanel({ state, gameId, onRefresh }: Props) {
  async function resign() {
    if (!gameId) return;
    await apiFetch(`/api/games/${gameId}/resign`, { method: "POST", body: "{}" });
    await onRefresh();
  }

  return (
    <section className="panel stack" style={{ padding: 16 }}>
      <div className="split">
        <h2 style={{ margin: 0, fontSize: 18 }}>Game state</h2>
        <button className="btn secondary" onClick={onRefresh}>Refresh</button>
      </div>
      {state ? (
        <>
          <div className="stack">
            <div className="split"><span className="tiny">Turn</span><strong>{state.turn}</strong></div>
            <div className="split"><span className="tiny">Moves</span><strong>{state.moveCount}</strong></div>
            <div className="split"><span className="tiny">Status</span><strong>{state.result || state.status}</strong></div>
            <div className="split"><span className="tiny">Reason</span><strong>{state.reason || "in play"}</strong></div>
          </div>
          <div>
            <div className="tiny">White</div>
            <div>{state.whiteAddress.slice(0, 8)}...{state.whiteAddress.slice(-6)}</div>
          </div>
          <div>
            <div className="tiny">Black</div>
            <div>{state.blackAddress.slice(0, 8)}...{state.blackAddress.slice(-6)}</div>
          </div>
          <button className="btn danger" onClick={resign} disabled={state.status === "finished"}>Resign</button>
        </>
      ) : (
        <div className="tiny">No active game selected.</div>
      )}
    </section>
  );
}
