"use client";

import { useEffect, useState } from "react";

type Challenge = {
  id: string;
  challenger_address: string;
  message: string;
  expires_at: string;
};

export default function LobbyPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  async function load() {
    const res = await fetch("/api/challenges/open");
    const data = await res.json();
    setChallenges(data.challenges || []);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel stack" style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Open challenges</h1>
      {challenges.length === 0 ? <div className="tiny">No open challenges right now.</div> : null}
      {challenges.map((challenge) => (
        <a className="panel split" style={{ padding: 12, color: "inherit", textDecoration: "none", boxShadow: "none" }} href={`/challenge/${challenge.id}`} key={challenge.id}>
          <div>
            <strong>{challenge.challenger_address.slice(0, 8)}...{challenge.challenger_address.slice(-6)}</strong>
            <div className="tiny">{challenge.message || "Ready to battle"}</div>
          </div>
          <span className="tiny">Accept</span>
        </a>
      ))}
    </section>
  );
}
