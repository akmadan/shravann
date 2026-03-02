"use client";

import {
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useConnectionState,
  useSessionContext,
  useSpeakingParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useCallback, useState } from "react";
import { endSession } from "@/lib/api";
import type { SessionStartResponse } from "@/lib/api";

type VoiceRoomUIProps = {
  agentName: string;
  lastSessionRef: React.MutableRefObject<SessionStartResponse["session"] | null>;
  onEnd: () => void;
};

/**
 * Voice room UI when connected via Session (same pattern as agent-starter-react).
 * SessionProvider + session.start() run token fetch and room connect + mic in the same user gesture.
 */
export default function VoiceRoomUI({
  agentName,
  lastSessionRef,
  onEnd,
}: VoiceRoomUIProps) {
  const { room, end, isConnected } = useSessionContext();
  const connectionState = useConnectionState(room);
  const speakingParticipants = useSpeakingParticipants();
  const [ending, setEnding] = useState(false);

  const agentSpeaking = speakingParticipants.some((p) => !p.isLocal);

  const handleEndCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      const sessionId = lastSessionRef.current?.id;
      if (sessionId) await endSession(sessionId);
    } catch {
      // still disconnect
    }
    await end();
    onEnd();
  }, [lastSessionRef, end, onEnd, ending]);

  const stateLabel =
    connectionState === "connected"
      ? "Connected"
      : connectionState === "reconnecting"
        ? "Reconnecting…"
        : "Connecting…";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b]">
      {/* Same as example: RoomAudioRenderer for remote (agent) audio */}
      <RoomAudioRenderer />

      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <StartAudio
          label="Enable speaker"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
        />

        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            connectionState === "connected"
              ? "bg-emerald-500/20 text-emerald-300"
              : connectionState === "reconnecting"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-600/50 text-zinc-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              connectionState === "connected"
                ? "bg-emerald-400"
                : connectionState === "reconnecting"
                  ? "animate-pulse bg-amber-400"
                  : "animate-pulse bg-zinc-400"
            }`}
          />
          {stateLabel}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <span className="text-xl">🎙</span>
          </div>
          <h1 className="text-lg font-medium text-white">{agentName}</h1>
          <p className="text-sm text-zinc-400">Voice session in progress</p>
          {agentSpeaking && (
            <p className="mt-1 text-xs text-emerald-400">Agent is speaking…</p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            If you don&apos;t hear the agent, click &quot;Enable speaker&quot;
            above.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={true}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <span className="text-xs">Mic</span>
          </TrackToggle>
          <button
            type="button"
            onClick={handleEndCall}
            disabled={ending}
            className="flex items-center gap-2 rounded-lg bg-red-500/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
