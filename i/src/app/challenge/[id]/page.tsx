import { ChallengeClient } from "./ChallengeClient";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeClient id={id} />;
}
