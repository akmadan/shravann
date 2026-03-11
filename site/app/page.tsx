const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const GITHUB_URL = "https://github.com/shravann/shravann";

/* ─── Navbar ─────────────────────────────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
            S
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Shravann
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-[13px] text-[#71717a] transition-colors hover:text-white">
            How it works
          </a>
          <a href="#stack" className="text-[13px] text-[#71717a] transition-colors hover:text-white">
            Tech Stack
          </a>
          <a href="#architecture" className="text-[13px] text-[#71717a] transition-colors hover:text-white">
            Architecture
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] text-[#71717a] transition-colors hover:text-white"
          >
            <GithubIcon size={14} />
            GitHub
          </a>
        </div>

        <a
          href={`${APP_URL}/sign-in`}
          className="rounded-md bg-white px-4 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Launch
        </a>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-40 md:pb-28">
      <div className="grid-fade pointer-events-none absolute inset-0">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="hero-orb pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.25)_0%,rgba(59,130,246,0.08)_50%,transparent_70%)] blur-3xl md:h-[700px] md:w-[700px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Tech badges */}
        <div className="mb-8 flex items-center justify-center gap-3 flex-wrap">
          <TechBadge>LiveKit</TechBadge>
          <TechBadge>OpenAI Realtime</TechBadge>
          <TechBadge>Gemini Live</TechBadge>
          <TechBadge>Go</TechBadge>
          <TechBadge>Next.js</TechBadge>
          <TechBadge>Python</TechBadge>
        </div>

        <h1 className="mx-auto max-w-4xl text-center text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
          Multi-agent voice AI.
          <br />
          <span className="gradient-text">5 minutes to first session.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-[#a1a1aa] md:text-lg">
          Design agent pipelines with handoffs and hierarchies. Connect OpenAI
          Realtime or Google Gemini Live. Deploy real-time voice sessions backed
          by LiveKit rooms. Open source.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`${APP_URL}/sign-in`}
            className="group flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-zinc-200"
          >
            Start building
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-6 py-3 text-sm font-medium text-[#a1a1aa] transition-all hover:border-white/[0.15] hover:text-white"
          >
            <GithubIcon size={15} />
            Star on GitHub
          </a>
        </div>

        {/* Terminal / code preview */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="code-block overflow-hidden rounded-xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-[11px] text-[#52525b]">
                quickstart.py — agent worker
              </span>
            </div>
            <div className="overflow-x-auto p-4 font-mono text-[13px] leading-6 md:p-6">
              <CodeLine n={1}>
                <span className="keyword">from</span> livekit.agents <span className="keyword">import</span> AgentServer
              </CodeLine>
              <CodeLine n={2}>
                <span className="keyword">from</span> livekit.agents.voice <span className="keyword">import</span> AgentSession
              </CodeLine>
              <CodeLine n={3}>
                <span className="keyword">from</span> livekit.plugins <span className="keyword">import</span> openai
              </CodeLine>
              <CodeLine n={4}>{""}</CodeLine>
              <CodeLine n={5}>
                server = <span className="function">AgentServer</span>()
              </CodeLine>
              <CodeLine n={6}>{""}</CodeLine>
              <CodeLine n={7}>
                <span className="keyword">@</span>server.<span className="function">rtc_session</span>()
              </CodeLine>
              <CodeLine n={8}>
                <span className="keyword">async def</span> <span className="function">entrypoint</span>(ctx):
              </CodeLine>
              <CodeLine n={9}>
                {"    "}agent_config = <span className="function">load_agent</span>(ctx)  <span className="comment"># from DB</span>
              </CodeLine>
              <CodeLine n={10}>
                {"    "}session = <span className="function">AgentSession</span>(
              </CodeLine>
              <CodeLine n={11}>
                {"        "}llm=openai.realtime.<span className="function">RealtimeModel</span>(
              </CodeLine>
              <CodeLine n={12}>
                {"            "}voice=<span className="string">&quot;alloy&quot;</span>, api_key=api_key
              </CodeLine>
              <CodeLine n={13}>
                {"        "})
              </CodeLine>
              <CodeLine n={14}>
                {"    "})
              </CodeLine>
              <CodeLine n={15}>
                {"    "}<span className="keyword">await</span> session.<span className="function">start</span>(agent=entry_agent, room=ctx.room)
              </CodeLine>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Design your agent pipeline",
      desc: "Create a multi-agent system in the visual builder. Define a supervisor, add specialist sub-agents, configure handoff logic between them. Set system prompts, voices, and entry points.",
      detail: "Pipeline: Config → Form → Supervisor → Specialists",
    },
    {
      step: "02",
      title: "Choose your provider",
      desc: "Select OpenAI Realtime API or Google Gemini Live as your speech-to-speech backbone. Add your API key in Settings — encrypted at rest with AES-256-GCM. Pick a voice from the provider's catalog.",
      detail: "OpenAI: alloy, sage, coral · Google: Puck, Charon, Zephyr",
    },
    {
      step: "03",
      title: "Create a session form",
      desc: "Build a form to collect caller info before the voice session starts — name, email, preferences. The form builder supports text, boolean, select, phone, and email fields with validators.",
      detail: "Form data is injected into the agent's context automatically",
    },
    {
      step: "04",
      title: "Go live",
      desc: "Share the session link. Your caller opens it, fills the form, and enters a LiveKit room. The Python worker loads the agent config from Postgres, spins up a RealtimeModel session, and the conversation begins.",
      detail: "LiveKit room → Worker dispatched → Agent session starts",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
          How it works
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          From zero to live voice sessions in 4 steps
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.step}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-[#3b82f6]">
                  {s.step}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <h3 className="text-[15px] font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#71717a]">
                {s.desc}
              </p>
              <div className="mt-4 rounded-md bg-[#0c0c0f] px-3 py-2">
                <p className="font-mono text-[11px] text-[#52525b]">
                  {s.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Tech Stack ─────────────────────────────────────────────── */

function TechStack() {
  const integrations = [
    {
      name: "LiveKit",
      role: "Real-time infrastructure",
      desc: "WebRTC rooms, agent dispatch, client SDKs. Handles all real-time audio transport between callers and agents.",
      badge: "Infrastructure",
    },
    {
      name: "OpenAI Realtime",
      role: "Speech-to-speech LLM",
      desc: "Native voice-to-voice with GPT-4o. Sub-second latency. Voices: alloy, shimmer, echo, fable, onyx, nova, ash, ballad, coral, sage, verse, marin, cedar.",
      badge: "Provider",
    },
    {
      name: "Google Gemini Live",
      role: "Speech-to-speech LLM",
      desc: "Gemini's Live API for low-latency two-way voice. Supports native audio models with built-in VAD. Voices: Puck, Charon, Zephyr.",
      badge: "Provider",
    },
    {
      name: "PostgreSQL",
      role: "Persistence",
      desc: "Agents, participants, forms, sessions, transcripts, encrypted API keys. The worker reads config directly from Postgres at session start.",
      badge: "Database",
    },
    {
      name: "Go API",
      role: "Backend (Chi + GORM)",
      desc: "REST API handling agent CRUD, session management, LiveKit room creation, form storage, and API key encryption with AES-256-GCM.",
      badge: "Backend",
    },
    {
      name: "Python Worker",
      role: "LiveKit Agents SDK",
      desc: "Dynamically loads agent config and API keys from DB. Builds multi-agent sessions with handoff tools. Supports both OpenAI and Gemini plugins.",
      badge: "Runtime",
    },
  ];

  return (
    <section id="stack" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
          Tech Stack
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Built on real infrastructure
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[#71717a]">
          No toy demos. Production-grade stack with encrypted keys, dynamic
          agent loading, and real-time audio transport.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {item.name}
                </h3>
                <span className="rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-[#52525b]">
                  {item.badge}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#3b82f6]">{item.role}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#71717a]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Architecture ───────────────────────────────────────────── */

function Architecture() {
  return (
    <section id="architecture" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
          Architecture
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Four apps, one platform
        </h2>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="code-block overflow-hidden rounded-xl font-mono text-[12px] leading-7 md:text-[13px]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[11px] text-[#52525b]">
                architecture
              </span>
            </div>
            <pre className="overflow-x-auto p-4 text-[#a1a1aa] md:p-6">{`┌─────────────────────┐      ┌─────────────────────┐      ┌──────────────┐
│  Web Dashboard      │─────▶│  Go REST API        │─────▶│  PostgreSQL  │
│  Next.js · Clerk    │ HTTP │  Chi · GORM         │ SQL  │              │
│  Agent Builder UI   │      │  Session + Room mgmt│      └──────▲───────┘
└─────────────────────┘      └──────────┬──────────┘             │
                                   ▲    │                        │
                         HTTP      │    │ LiveKit Server SDK     │ psycopg
                                   │    ▼                        │
┌─────────────────────┐      ┌─────────────────────┐      ┌─────┴────────┐
│  Voice Session UI   │─────▶│  LiveKit Cloud       │◀─────│  Agent Worker│
│  Next.js · LK Client│ WSS │  WebRTC Rooms        │ Job  │  Python      │
│  Orb + Transcript   │      │                     │ Disp │  OpenAI/     │
└──────────┬──────────┘      └─────────────────────┘      │  Gemini      │
           │                                               └──────────────┘
           └──────────────────▶ Go API (start/end session, get agent)`}</pre>
          </div>
        </div>

        {/* Component cards */}
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-2">
          <ArchCard
            name="apps/web"
            tech="Next.js 15 · Tailwind · Clerk · React Flow"
            desc="Dashboard with pipeline agent builder, form builder, session viewer, settings page for API key management."
          />
          <ArchCard
            name="apps/api"
            tech="Go · Chi · GORM · PostgreSQL"
            desc="REST API — agent CRUD, session lifecycle, LiveKit room creation, AES-256-GCM API key encryption."
          />
          <ArchCard
            name="apps/session"
            tech="Next.js · LiveKit Client SDK"
            desc="Voice session UI — split view with animated orb, Google Meet-style controls, and live chat transcript."
          />
          <ArchCard
            name="apps/worker"
            tech="Python · LiveKit Agents · OpenAI · Google"
            desc="Loads agent config + API keys from Postgres. Builds multi-agent sessions with handoff tools. Connects to LiveKit rooms."
          />
        </div>
      </div>
    </section>
  );
}

function ArchCard({
  name,
  tech,
  desc,
}: {
  name: string;
  tech: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 transition-colors hover:border-white/[0.1]">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[13px] font-semibold text-white">
          {name}
        </span>
      </div>
      <p className="mt-0.5 font-mono text-[11px] text-[#52525b]">{tech}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-[#71717a]">{desc}</p>
    </div>
  );
}

/* ─── Agent Model ────────────────────────────────────────────── */

function AgentModel() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
          Agent Model
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Hierarchical multi-agent design
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Code representation */}
          <div className="code-block overflow-hidden rounded-xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-[11px] text-[#52525b]">
                agent structure
              </span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-6 text-[#a1a1aa] md:p-6 md:text-[13px]">{`Agent
├── name: "Hospital HR"
├── provider: "openai"
├── voice: "sage"
├── form: intake-form
│
├── Participant (entry)
│   ├── name: "Supervisor"
│   ├── role: "supervisor"
│   ├── prompt: "Route to specialist..."
│   └── handoffs → [hr, benefits]
│
├── Participant
│   ├── name: "HR Agent"
│   ├── role: "hr"
│   └── prompt: "Handle HR queries..."
│
└── Participant
    ├── name: "Benefits Agent"
    ├── role: "benefits"
    └── prompt: "Handle benefits..."`}</pre>
          </div>

          {/* Explanation */}
          <div className="flex flex-col justify-center space-y-6">
            <Feature
              title="Entry point + sub-agents"
              desc="One participant is the entry point. It greets the caller and hands off to specialists based on intent. All handoffs are automatic via function tools."
            />
            <Feature
              title="Shared context"
              desc="A system prompt is shared across all participants. Each participant also has its own prompt. The shared context is prepended at runtime."
            />
            <Feature
              title="Session-level voice"
              desc="Provider and voice are set at the agent level — all participants share the same RealtimeModel session. OpenAI or Gemini, one voice per session."
            />
            <Feature
              title="Dynamic loading"
              desc="The worker loads the full agent tree from Postgres at session start. No redeploys needed. Change config in the dashboard, next session picks it up."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-[#71717a]">{desc}</p>
    </div>
  );
}

/* ─── CTA ────────────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[500px] rounded-full bg-[#3b82f6]/[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <p className="font-mono text-xs text-[#52525b]">$ pip install livekit-agents</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
          Ship your first voice agent today
        </h2>
        <p className="mt-3 text-[#71717a]">
          Open source. Self-host or use our cloud. Apache 2.0.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`${APP_URL}/sign-in`}
            className="group flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-zinc-200"
          >
            Launch App
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-6 py-3 text-sm font-medium text-[#a1a1aa] transition-all hover:border-white/[0.15] hover:text-white"
          >
            <GithubIcon size={15} />
            View source
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-white text-[9px] font-bold text-black">
            S
          </div>
          <span className="text-[13px] text-[#52525b]">Shravann</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#52525b] transition-colors hover:text-[#71717a]"
          >
            GitHub
          </a>
          <span className="text-xs text-[#3f3f46]">
            Apache 2.0 &middot; {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Shared components ──────────────────────────────────────── */

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 font-mono text-[11px] text-[#71717a] transition-colors hover:border-white/[0.15] hover:text-[#a1a1aa]">
      {children}
    </span>
  );
}

function CodeLine({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="line-number mr-4 inline-block w-6 text-right">{n}</span>
      <span className="text-[#e4e4e7]">{children}</span>
    </div>
  );
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <TechStack />
      <Architecture />
      <AgentModel />
      <CTA />
      <Footer />
    </main>
  );
}
