import { sql, initDb } from "@/lib/db";
import type { GameState, Side } from "@/lib/chess-game";

function weekStartISO(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function captureBonus(state: GameState, side: Side) {
  const opponentSide = side === "white" ? "black" : "white";
  return state.captured[opponentSide].reduce((total, piece) => {
    if (piece.isLegendary) total += 25;
    if (piece.isAgent) total += 20;
    if (piece.isZombie) total += 15;
    return total;
  }, 0);
}

function basePoints(state: GameState, side: Side) {
  if (state.result === "draw") return 30;
  if (state.result === `${side}_win`) return 100;
  return -10;
}

function perfectWinBonus(state: GameState, side: Side) {
  if (state.result !== `${side}_win`) return 0;
  return state.captured[side].length === 0 ? 50 : 0;
}

export async function finalizePoints(state: GameState) {
  await initDb();
  if (!state.result) return { white: 0, black: 0 };
  const white = basePoints(state, "white") + captureBonus(state, "white") + perfectWinBonus(state, "white");
  const black = basePoints(state, "black") + captureBonus(state, "black") + perfectWinBonus(state, "black");
  await applyPlayerPoints(state.whiteAddress, state.result === "white_win" ? "win" : state.result === "draw" ? "draw" : "loss", white);
  await applyPlayerPoints(state.blackAddress, state.result === "black_win" ? "win" : state.result === "draw" ? "draw" : "loss", black);
  return { white, black };
}

async function applyPlayerPoints(address: string, outcome: "win" | "loss" | "draw", points: number) {
  const week = weekStartISO();
  if (outcome === "win") {
    await sql`
      UPDATE players
      SET wins = wins + 1,
          total_points = total_points + ${points},
          win_streak = win_streak + 1,
          best_streak = GREATEST(best_streak, win_streak + 1),
          last_seen = NOW()
      WHERE address = ${address}
    `;
  } else if (outcome === "loss") {
    await sql`
      UPDATE players
      SET losses = losses + 1,
          total_points = total_points + ${points},
          win_streak = 0,
          last_seen = NOW()
      WHERE address = ${address}
    `;
  } else {
    await sql`
      UPDATE players
      SET draws = draws + 1,
          total_points = total_points + ${points},
          last_seen = NOW()
      WHERE address = ${address}
    `;
  }
  await sql`
    INSERT INTO weekly_points(player_address, week_start, points)
    VALUES (${address}, ${week}, ${points})
    ON CONFLICT(player_address, week_start)
    DO UPDATE SET points = weekly_points.points + ${points}
  `;
}
