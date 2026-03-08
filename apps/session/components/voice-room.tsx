"use client";

import {
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useConnectionState,
  useSessionContext,
  useVoiceAssistant,
  useTranscriptions,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { PhoneOff, Bot, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { endSession, saveTranscripts } from "@/lib/api";
import type { SessionStartResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────

type VoiceRoomUIProps = {
  agentName: string;
  lastSessionRef: React.MutableRefObject<
    SessionStartResponse["session"] | null
  >;
  onEnd: () => void;
};

// ─── Glowing Orb ──────────────────────────────────────────────────

const ORB_STYLES: Record<
  string,
  { color: string; shadow: string; ringColor: string }
> = {
  speaking: {
    color: "#10b981",
    shadow: "0 0 60px 20px rgba(16,185,129,0.35), 0 0 120px 40px rgba(16,185,129,0.15)",
    ringColor: "rgba(16,185,129,0.3)",
  },
  listening: {
    color: "#3b82f6",
    shadow: "0 0 40px 15px rgba(59,130,246,0.25), 0 0 80px 30px rgba(59,130,246,0.1)",
    ringColor: "rgba(59,130,246,0.2)",
  },
  thinking: {
    color: "#f59e0b",
    shadow: "0 0 50px 18px rgba(245,158,11,0.3), 0 0 100px 35px rgba(245,158,11,0.12)",
    ringColor: "rgba(245,158,11,0.25)",
  },
};

const DEFAULT_ORB = {
  color: "#52525b",
  shadow: "0 0 30px 10px rgba(82,82,91,0.15), 0 0 60px 20px rgba(82,82,91,0.06)",
  ringColor: "rgba(82,82,91,0.1)",
};

function GlowingOrb({ state }: { state: string }) {
  const orb = ORB_STYLES[state] ?? DEFAULT_ORB;
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer ring 2 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          border: `1.5px solid ${orb.ringColor}`,
          animation: isSpeaking
            ? "orbExpand 1.8s ease-in-out infinite"
            : isThinking
              ? "orbPulse 1.2s ease-in-out infinite"
              : "orbPulse 3s ease-in-out infinite",
          opacity: 0.4,
        }}
      />

      {/* Outer ring 1 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 150,
          height: 150,
          border: `2px solid ${orb.ringColor}`,
          animation: isSpeaking
            ? "orbExpand 1.8s ease-in-out infinite 0.3s"
            : isThinking
              ? "orbPulse 1.2s ease-in-out infinite 0.2s"
              : "orbPulse 3s ease-in-out infinite 0.5s",
          opacity: 0.5,
        }}
      />

      {/* Core orb */}
      <div
        className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${orb.color}40, ${orb.color}15 70%, transparent)`,
          boxShadow: orb.shadow,
          animation: isSpeaking
            ? "orbGlow 0.8s ease-in-out infinite alternate"
            : isThinking
              ? "orbGlow 1s ease-in-out infinite alternate"
              : "orbGlow 2.5s ease-in-out infinite alternate",
        }}
      >
        <div
          className="h-16 w-16 rounded-full"
          style={{
            background: `radial-gradient(circle at 45% 45%, ${orb.color}, ${orb.color}80 60%, transparent)`,
          }}
        />
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes orbExpand {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes orbGlow {
          0% { filter: brightness(0.9); }
          100% { filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function stateToLabel(state: string): string {
  switch (state) {
    case "speaking":
      return "Speaking...";
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "connecting":
    case "initializing":
    case "pre-connect-buffering":
      return "Connecting...";
    case "idle":
      return "Ready";
    case "disconnected":
      return "Disconnected";
    case "failed":
      return "Connection failed";
    default:
      return "Connecting...";
  }
}

function stateToColor(state: string): string {
  switch (state) {
    case "speaking":
      return "text-emerald-400";
    case "listening":
      return "text-blue-400";
    case "thinking":
      return "text-amber-400";
    case "idle":
      return "text-zinc-400";
    default:
      return "text-zinc-500";
  }
}

// ─── Main Component ───────────────────────────────────────────────

export default function VoiceRoomUI({
  agentName,
  lastSessionRef,
  onEnd,
}: VoiceRoomUIProps) {
  const { room, end } = useSessionContext();
  const connectionState = useConnectionState(room);
  const { state: agentState } = useVoiceAssistant();
  const transcriptions = useTranscriptions();
  const [ending, setEnding] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const localIdentity = room?.localParticipant?.identity ?? "";

  // Build chat messages from transcription streams
  const messages = transcriptions
    .filter((t) => t.text.trim().length > 0)
    .map((t, i) => ({
      id: `${t.participantInfo.identity}-${i}`,
      text: t.text,
      isUser: t.participantInfo.identity === localIdentity,
    }));

  // Auto-scroll transcript on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleEndCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      const sessionId = lastSessionRef.current?.id;
      if (sessionId) {
        const transcriptPayload = messages.map((m) => ({
          role: m.isUser ? "user" : "agent",
          content: m.text,
        }));
        if (transcriptPayload.length > 0) {
          await saveTranscripts(sessionId, transcriptPayload).catch(() => {});
        }
        await endSession(sessionId);
      }
    } catch {
      // still disconnect
    }
    await end();
    onEnd();
  }, [lastSessionRef, end, onEnd, ending, messages]);

  const isConnected = connectionState === "connected";

  return (
    <div className="flex h-screen w-full bg-[#09090b]">
      <RoomAudioRenderer />

      {/* ─── Left Panel: Orb + Controls ──────────────── */}
      <div className="flex w-[45%] flex-col items-center justify-between border-r border-zinc-800/60 px-8 py-6">
        {/* Top: connection badge + enable speaker */}
        <div className="flex w-full flex-col items-center gap-3">
          <StartAudio
            label="Enable speaker"
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
          />
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              isConnected
                ? "bg-emerald-500/20 text-emerald-300"
                : connectionState === "reconnecting"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-zinc-600/50 text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isConnected
                  ? "bg-emerald-400"
                  : "animate-pulse bg-zinc-400"
              }`}
            />
            {isConnected ? "Connected" : "Connecting..."}
          </div>
        </div>

        {/* Center: Orb + Agent Name + State */}
        <div className="flex flex-col items-center gap-5">
          <GlowingOrb state={agentState} />

          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-xl font-semibold text-white">{agentName}</h1>
            <p className={`text-sm font-medium ${stateToColor(agentState)}`}>
              {stateToLabel(agentState)}
            </p>
          </div>
        </div>

        {/* Bottom: Controls (Google Meet style) */}
        <div className="flex items-center gap-4">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={true}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-white transition-colors hover:bg-zinc-700 data-[lk-muted=true]:bg-red-500/20 data-[lk-muted=true]:text-red-400 [&>svg]:h-5 [&>svg]:w-5"
          />

          <button
            type="button"
            onClick={handleEndCall}
            disabled={ending}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>

      {/* ─── Right Panel: Transcript ─────────────────── */}
      <div className="flex w-[55%] flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/60 px-6 py-4">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold text-white">Transcript</h2>
          {messages.length > 0 && (
            <span className="text-xs text-zinc-500">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Bot size={18} className="text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-500">
                Transcript will appear here...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.isUser ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.isUser
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {m.isUser ? (
                      <User size={14} />
                    ) : (
                      <Bot size={14} />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      m.isUser
                        ? "rounded-tr-sm bg-blue-500/15 text-blue-100"
                        : "rounded-tl-sm bg-zinc-800/80 text-zinc-200"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {m.isUser ? "You" : agentName}
                    </p>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
