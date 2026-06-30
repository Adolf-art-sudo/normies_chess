"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChessBoard } from "@/components/ChessBoard";
import { GamePanel } from "@/components/GamePanel";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PlayerSetup } from "@/components/PlayerSetup";
import { apiFetch, getStoredSession } from "@/components/auth-client";
import type { GameState } from "@/lib/chess-game";

export default function HomePage() {
  const router = useRouter();
  const [gameId, setGameId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const session = getStoredSession();

  const loadGame = useCallback(async (id = gameId) => {
    if (!id) return;
    const res = await fetch(`/api/games/${id}`);
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
    if (!gameId) return;
    const timer = window.setInterval(() => loadGame(gameId), 2000);
    return () => window.clearInterval(timer);
  }, [gameId, loadGame]);

  return (
    <div className="grid-app">
      <PlayerSetup
        onGameCreated={(id) => {
          setGameId(id);
          router.replace(`/?game=${id}`);
          loadGame(id);
        }}
      />
      <ChessBoard state={state} viewerAddress={session?.address} onMove={move} />
      <div className="stack">
        <GamePanel state={state} gameId={gameId} onRefresh={() => loadGame()} />
        <LeaderboardTable />
      </div>
    </div>
  );
}
