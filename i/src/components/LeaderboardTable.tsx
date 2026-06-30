"use client";

import { useEffect, useState } from "react";

type Row = {
  address: string;
  wins: number;
  losses: number;
  draws: number;
  total_points?: number;
  weekly_points?: number;
  best_streak: number;
  is_holder: boolean;
};

export function LeaderboardTable() {
  const [mode, setMode] = useState<"all-time" | "weekly">("all-time");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/leaderboard/${mode}`)
      .then((res) => res.json())
      .then((data) => setRows(data.rows || []));
  }, [mode]);

  return (
    <section className="panel stack" style={{ padding: 16 }}>
      <div className="split">
        <h2 style={{ margin: 0, fontSize: 18 }}>Leaderboard</h2>
        <div className="row">
          <button className={`btn ${mode === "all-time" ? "" : "secondary"}`} onClick={() => setMode("all-time")}>All-time</button>
          <button className={`btn ${mode === "weekly" ? "" : "secondary"}`} onClick={() => setMode("weekly")}>Weekly</button>
        </div>
      </div>
      <div className="stack">
        {rows.length === 0 ? <div className="tiny">No completed games yet.</div> : null}
        {rows.map((row, index) => (
          <div className="panel split" style={{ padding: 10, boxShadow: "none" }} key={row.address}>
            <div>
              <strong>#{index + 1}</strong> {row.address.slice(0, 6)}...{row.address.slice(-4)}
              <div className="tiny">{row.wins}W {row.losses}L {row.draws}D | best streak {row.best_streak}</div>
            </div>
            <strong>{row.total_points ?? row.weekly_points ?? 0}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
