"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChessBoard } from "@/components/ChessBoard";
import { GamePanel } from "@/components/GamePanel";
import { apiFetch, getStoredSession } from "@/components/auth-client";
import type { GameState } from "@/lib/chess-game";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const [state, setState] = useState<GameState | null>(null);
  const session = getStoredSession();

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    const res = await fetch(`/api/games/${gameId}`);
    if (!res.ok) return;
    const data = await res.json();
    setState(data.state);
  }, [gameId]);

  async function move(from: string, to: string) {
    if (!gameId) return;
    const res = await apiFetch(`/api/games/${gameId}/move`, {
      method: "POST",
      body: JSON.stringify({ from, to })
    });
    const data = await res.json();
    if (res.ok) setState(data.state);
  }

  useEffect(() => {
    loadGame();
    const timer = window.setInterval(loadGame, 2000);
    return () => window.clearInterval(timer);
  }, [loadGame]);

  return (
    <div className="grid-app">
      <ChessBoard state={state} viewerAddress={session?.address} onMove={move} />
      <GamePanel state={state} gameId={gameId} onRefresh={loadGame} />
    </div>
  );
}