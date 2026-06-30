"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { GameState } from "@/lib/chess-game";

type Props = {
  state: GameState | null;
  viewerAddress?: string | null;
  onMove?: (from: string, to: string) => Promise<void>;
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function ChessBoard({ state, viewerAddress, onMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const viewerSide = state && viewerAddress?.toLowerCase() === state.blackAddress ? "black" : "white";
  const ranks = viewerSide === "black" ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const orderedFiles = viewerSide === "black" ? [...files].reverse() : files;
  const legal = useMemo(() => {
    if (!state || !selected) return new Set<string>();
    const chess = new Chess(state.fen);
    return new Set(chess.moves({ square: selected as never, verbose: true }).map((move) => move.to));
  }, [state, selected]);

  async function click(square: string) {
    if (!state || !onMove || state.status === "finished") return;
    const piece = state.board[square];
    if (selected && legal.has(square)) {
      await onMove(selected, square);
      setSelected(null);
      return;
    }
    if (piece) setSelected(square);
    else setSelected(null);
  }

  if (!state) {
    return (
      <section className="panel stack" style={{ padding: 16, minHeight: 420, placeItems: "center" }}>
        <div className="tiny">Create or open a game to load the board.</div>
      </section>
    );
  }

  return (
    <section className="panel" style={{ padding: 16 }}>
      <div className="board" aria-label="Normies chess board">
        {ranks.flatMap((rank) =>
          orderedFiles.map((file) => {
            const square = `${file}${rank}`;
            const piece = state.board[square];
            const light = (files.indexOf(file) + rank) % 2 === 1;
            const last = state.lastMove?.from === square || state.lastMove?.to === square;
            const glow = piece?.isAgent ? "glow-agent" : piece?.isZombie ? "glow-zombie" : piece?.isLegendary ? "glow-legendary" : "";
            return (
              <button
                key={square}
                className={`square ${light ? "light" : "dark"} ${selected === square ? "selected" : ""} ${legal.has(square) ? "legal" : ""} ${last ? "last" : ""}`}
                onClick={() => click(square)}
                title={piece ? `#${piece.tokenId} ${piece.chessPiece.toUpperCase()} ${piece.color}` : square}
              >
                {piece ? (
                  <span className={`piece ${glow}`}>
                    <img src={`/api/normies/image/${piece.tokenId}`} alt={`Normie ${piece.tokenId}`} />
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
