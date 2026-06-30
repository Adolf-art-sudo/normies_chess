"use client";

import { useCallback, useEffect, useState } from "react";
import { ChessBoard } from "@/components/ChessBoard";
import { GamePanel } from "@/components/GamePanel";
import { apiFetch, getStoredSession } from "@/components/auth-client";
import type { GameState } from "@/lib/chess-game";

export function GameClient({ gameId }: { gameId: string }) {
  const [state, setState] = useState<GameState | null>(null);
  const session = getStoredSession();

  const load = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`);
    if (!res.ok) return;
    const data = await res.json();
    setState(data.state);
  }, [gameId]);

  async function move(from: string, to: string) {
    const res = await apiFetch(`/api/games/${gameId}/move`, {
      method: "POST",
      body: JSON.stringify({ from, to })
    });
    const data = await res.json();
    if (res.ok) setState(data.state);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 2000);
    return () => window.clearInterval(timer);
  }, [gameId, load]);

  return (
    <div className="grid-app" style={{ gridTemplateColumns: "1fr minmax(280px, 360px)" }}>
      <ChessBoard state={state} viewerAddress={session?.address} onMove={move} />
      <GamePanel state={state} gameId={gameId} onRefresh={load} />
    </div>
  );
}
