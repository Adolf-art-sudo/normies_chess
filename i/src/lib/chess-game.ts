import { Chess } from "chess.js";
import type { PieceData } from "@/lib/normies-api";

export type Side = "white" | "black";

export type BoardPiece = PieceData & {
  color: Side;
  square: string;
  chessPiece: "k" | "q" | "r" | "b" | "n" | "p";
  captured: boolean;
};

export type GameState = {
  id: string;
  whiteAddress: string;
  blackAddress: string;
  fen: string;
  pgn: string;
  turn: Side;
  status: "active" | "draw_offered" | "finished";
  result: "white_win" | "black_win" | "draw" | null;
  reason: string | null;
  board: Record<string, BoardPiece>;
  captured: {
    white: BoardPiece[];
    black: BoardPiece[];
  };
  drawOfferFrom: Side | null;
  lastMove: { from: string; to: string } | null;
  moveCount: number;
  createdAt: string;
  updatedAt: string;
};

const roleToPiece = {
  king: "k",
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
  pawn: "p"
} as const;

const whiteLayout = [
  ["a1", "rook"],
  ["b1", "knight"],
  ["c1", "bishop"],
  ["d1", "queen"],
  ["e1", "king"],
  ["f1", "bishop"],
  ["g1", "knight"],
  ["h1", "rook"],
  ["a2", "pawn"],
  ["b2", "pawn"],
  ["c2", "pawn"],
  ["d2", "pawn"],
  ["e2", "pawn"],
  ["f2", "pawn"],
  ["g2", "pawn"],
  ["h2", "pawn"]
] as const;

const blackLayout = [
  ["a8", "rook"],
  ["b8", "knight"],
  ["c8", "bishop"],
  ["d8", "queen"],
  ["e8", "king"],
  ["f8", "bishop"],
  ["g8", "knight"],
  ["h8", "rook"],
  ["a7", "pawn"],
  ["b7", "pawn"],
  ["c7", "pawn"],
  ["d7", "pawn"],
  ["e7", "pawn"],
  ["f7", "pawn"],
  ["g7", "pawn"],
  ["h7", "pawn"]
] as const;

function pickPiece(pool: PieceData[], wanted: PieceData["piece"]) {
  const exact = pool.findIndex((piece) => piece.piece === wanted);
  const index = exact >= 0 ? exact : 0;
  return pool.splice(index, 1)[0];
}

function mapSide(side: Side, pieces: PieceData[]) {
  const pool = [...pieces];
  const layout = side === "white" ? whiteLayout : blackLayout;
  const mapped: Record<string, BoardPiece> = {};
  for (const [square, wanted] of layout) {
    const piece = pickPiece(pool, wanted);
    mapped[square] = {
      ...piece,
      color: side,
      square,
      chessPiece: roleToPiece[wanted],
      captured: false
    };
  }
  return mapped;
}

export function createGameState(whiteAddress: string, blackAddress: string, whitePieces: PieceData[], blackPieces: PieceData[]) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    whiteAddress,
    blackAddress,
    fen: new Chess().fen(),
    pgn: "",
    turn: "white",
    status: "active",
    result: null,
    reason: null,
    board: {
      ...mapSide("white", whitePieces),
      ...mapSide("black", blackPieces)
    },
    captured: { white: [], black: [] },
    drawOfferFrom: null,
    lastMove: null,
    moveCount: 0,
    createdAt: now,
    updatedAt: now
  } satisfies GameState;
}

export function makeMove(state: GameState, side: Side, from: string, to: string) {
  if (state.status === "finished") throw new Error("Game is already finished.");
  if (state.turn !== side) throw new Error("It is not your turn.");
  const moving = state.board[from];
  if (!moving || moving.color !== side) throw new Error("No playable piece on that square.");

  const chess = new Chess(state.fen);
  const move = chess.move({ from, to, promotion: "q" });
  if (!move) throw new Error("Illegal chess move.");

  const next: GameState = JSON.parse(JSON.stringify(state));
  const captured = next.board[to];
  if (captured) {
    captured.captured = true;
    next.captured[captured.color].push(captured);
    delete next.board[to];
  }

  const piece = next.board[from];
  delete next.board[from];
  piece.square = to;
  if (move.promotion) piece.chessPiece = "q";
  next.board[to] = piece;
  next.fen = chess.fen();
  next.pgn = chess.pgn();
  next.turn = chess.turn() === "w" ? "white" : "black";
  next.lastMove = { from, to };
  next.moveCount += 1;
  next.drawOfferFrom = null;
  next.updatedAt = new Date().toISOString();

  let result: GameState["result"] = null;
  let reason: string | null = null;
  if (chess.isCheckmate()) {
    result = side === "white" ? "white_win" : "black_win";
    reason = "checkmate";
  } else if (chess.isDraw()) {
    result = "draw";
    reason = chess.isStalemate() ? "stalemate" : "draw";
  }
  if (result) {
    next.status = "finished";
    next.result = result;
    next.reason = reason;
  }

  return {
    state: next,
    move,
    movingNormieId: moving.tokenId,
    capturedNormieId: captured?.tokenId || null,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate()
  };
}

export function sideForAddress(state: GameState, address: string): Side | null {
  const normalized = address.toLowerCase();
  if (state.whiteAddress === normalized) return "white";
  if (state.blackAddress === normalized) return "black";
  return null;
}
