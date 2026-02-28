import SessionStart from "@/components/session-start";

type Props = { params: Promise<{ agentId: string }> };

export default async function AgentSessionPage({ params }: Props) {
  const { agentId } = await params;

  return (
    <div className="min-h-screen">
      <SessionStart agentId={agentId} />
    </div>
  );
}
