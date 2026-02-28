"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useState } from "react";
import { endSession, type SessionStartResponse } from "@/lib/api";
import "@livekit/components-styles";

type VoiceRoomViewProps = {
  startResult: SessionStartResponse;
  livekitUrl: string;
  agentName: string;
  onCallEnded: () => void;
};

export default function VoiceRoomView({
  startResult,
  livekitUrl,
  agentName,
  onCallEnded,
}: VoiceRoomViewProps) {
  const handleDisconnected = useCallback(() => {
    onCallEnded();
  }, [onCallEnded]);

  return (
    <LiveKitRoom
      token={startResult.token}
      serverUrl={livekitUrl}
      connect={true}
      onDisconnected={handleDisconnected}
      className="flex min-h-screen flex-col items-center justify-center bg-[#09090b]"
      audio={true}
      video={false}
      options={{
        // Publish mic so the agent can hear the user
        publishDefaults: { simulcast: false },
        // Subscribe to remote tracks so we receive agent audio
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      {/* Renders remote audio (agent's voice) so the user can hear it */}
      <RoomAudioRenderer />
      <VoiceRoomUI
        sessionId={startResult.session.id}
        agentName={agentName}
        onEnd={handleDisconnected}
      />
    </LiveKitRoom>
  );
}

function VoiceRoomUI({
  sessionId,
  agentName,
  onEnd,
}: {
  sessionId: string;
  agentName: string;
  onEnd: () => void;
}) {
  const room = useRoomContext();
  const [ending, setEnding] = useState(false);

  const handleEndCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endSession(sessionId);
    } catch {
      // still disconnect locally
    }
    room.disconnect();
    onEnd();
  }, [sessionId, room, onEnd, ending]);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 px-4">
      {/* Shows "Enable speaker" when browser blocks audio until user gesture */}
      <StartAudio
        label="Enable speaker"
        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
      />
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <span className="text-xl">🎙</span>
        </div>
        <h1 className="text-lg font-medium text-white">{agentName}</h1>
        <p className="text-sm text-zinc-400">Voice session in progress</p>
        <p className="mt-2 text-xs text-zinc-500">
          Allow microphone when prompted. If you don&apos;t hear the agent, click &quot;Enable speaker&quot; above.
        </p>
      </div>

      <button
        type="button"
        onClick={handleEndCall}
        disabled={ending}
        className="flex items-center gap-2 rounded-lg bg-red-500/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        End call
      </button>
    </div>
  );
}
