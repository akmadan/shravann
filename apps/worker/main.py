import json
import logging

from dotenv import load_dotenv

from livekit.agents import AgentServer, JobContext, cli
from livekit.agents.voice import AgentSession
from livekit.plugins import openai

from agent import SessionData, build_agents, get_entry_point, load_agent

logger = logging.getLogger("shravann.worker")
logger.setLevel(logging.INFO)

load_dotenv()

DEFAULT_VOICE = "alloy"


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

    # Fallback: room name format is session-{agentID}__{timestamp}__{identity}
    name = ctx.room.name
    if name and name.startswith("session-"):
        parts = name[len("session-"):].split("__")
        if parts:
            return parts[0]

    raise ValueError(f"Could not extract agent_id from room metadata or name: {ctx.room.name}")


def resolve_voice(agent_config, entry_participant) -> str:
    """Pick the voice for the Realtime session from the entry-point participant."""
    if entry_participant and entry_participant.voice_id:
        return entry_participant.voice_id
    return DEFAULT_VOICE


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    agent_id = extract_agent_id(ctx)
    logger.info("Session started — loading agent %s from database", agent_id)

    agent_config = load_agent(agent_id)
    if not agent_config.participants:
        raise ValueError(f"Agent {agent_id} has no participants configured")

    agents = build_agents(agent_config)
    entry_agent = get_entry_point(agent_config, agents)

    entry_participant = next(
        (p for p in agent_config.participants if p.is_entry_point),
        agent_config.participants[0],
    )
    voice = resolve_voice(agent_config, entry_participant)

    logger.info(
        "Agent loaded: %s (%d participants, entry=%s, voice=%s)",
        agent_config.name,
        len(agent_config.participants),
        entry_participant.name,
        voice,
    )

    userdata = SessionData(agent_id=agent_id, agents=agents)

    session = AgentSession[SessionData](
        userdata=userdata,
        llm=openai.realtime.RealtimeModel(voice=voice),
        max_tool_steps=5,
    )

    await session.start(
        agent=entry_agent,
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)
