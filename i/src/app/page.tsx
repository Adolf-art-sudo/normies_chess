"use client";

import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function HomePage() {
  return (
    <div className="grid-app">
      <section className="panel stack" style={{ padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Normies Chess</h1>
        <p className="tiny">NFT pieces. Server-validated moves. Vercel-ready.</p>
        <div className="row">
          <Link className="btn" href="/setup">Create battle</Link>
        </div>
      </section>
      <LeaderboardTable />
    </div>
  );
}