import json
import logging

from dotenv import load_dotenv

from livekit.agents import AgentServer, JobContext, cli
from livekit.agents.voice import AgentSession
from livekit.plugins import openai, google

from agent import SessionData, build_agents, get_entry_point, load_agent, load_project_api_keys

logger = logging.getLogger("shravann.worker")
logger.setLevel(logging.INFO)

load_dotenv()

OPENAI_DEFAULT_VOICE = "alloy"
GOOGLE_DEFAULT_VOICE = "Puck"


def extract_agent_id(ctx: JobContext) -> str:
    """Extract agent_id from LiveKit room metadata, falling back to room name parsing."""
    meta_str = ctx.room.metadata
    if meta_str:
        try:
            meta = json.loads(meta_str)
            if "agent_id" in meta:
                return meta["agent_id"]
        except (json.JSONDecodeError, TypeError):
            pass

    name = ctx.room.name
    if name and name.startswith("session-"):
        parts = name[len("session-"):].split("__")
        if parts:
            return parts[0]

    raise ValueError(f"Could not extract agent_id from room metadata or name: {ctx.room.name}")


def resolve_voice(entry_participant, provider: str) -> str:
    """Pick the voice for the Realtime session from the entry-point participant."""
    if entry_participant and entry_participant.voice_id:
        return entry_participant.voice_id
    return GOOGLE_DEFAULT_VOICE if provider == "google" else OPENAI_DEFAULT_VOICE


def build_realtime_model(provider: str, voice: str, api_keys: dict[str, str]):
    """Instantiate the right RealtimeModel based on the agent's provider setting."""
    if provider == "google":
        api_key = api_keys.get("google")
        if not api_key:
            raise ValueError(
                "Google API key not configured for this project. "
                "Configure it in the dashboard Settings page."
            )
        return google.realtime.RealtimeModel(
            voice=voice,
            api_key=api_key,
        )

    api_key = api_keys.get("openai")
    if not api_key:
        raise ValueError(
            "OpenAI API key not configured for this project. "
            "Configure it in the dashboard Settings page."
        )
    return openai.realtime.RealtimeModel(
        voice=voice,
        api_key=api_key,
    )


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    agent_id = extract_agent_id(ctx)
    logger.info("Session started — loading agent %s from database", agent_id)

    agent_config = load_agent(agent_id)
    if not agent_config.participants:
        raise ValueError(f"Agent {agent_id} has no participants configured")

    provider = agent_config.model if agent_config.model in ("openai", "google") else "openai"

    api_keys = load_project_api_keys(agent_config.project_id)
    agents = build_agents(agent_config)
    entry_agent = get_entry_point(agent_config, agents)

    entry_participant = next(
        (p for p in agent_config.participants if p.is_entry_point),
        agent_config.participants[0],
    )
    voice = resolve_voice(entry_participant, provider)
    llm = build_realtime_model(provider, voice, api_keys)

    logger.info(
        "Agent loaded: %s (provider=%s, %d participants, entry=%s, voice=%s)",
        agent_config.name,
        provider,
        len(agent_config.participants),
        entry_participant.name,
        voice,
    )

    userdata = SessionData(agent_id=agent_id, agents=agents)

    session = AgentSession[SessionData](
        userdata=userdata,
        llm=llm,
        max_tool_steps=5,
    )

    await session.start(
        agent=entry_agent,
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)
