"use client";

import { useRouter } from "next/navigation";
import { PlayerSetup } from "@/components/PlayerSetup";

export default function SetupPage() {
  const router = useRouter();

  return (
    <div className="grid-app">
      <PlayerSetup
        onGameCreated={(id) => {
          router.push(`/game/${id}`);
        }}
      />
    </div>
  );
}
