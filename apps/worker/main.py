"""Shravann Agent Worker — LiveKit agent server that dynamically loads
agent configurations from Postgres at session start."""

import json
import logging

from dotenv import load_dotenv

from livekit.agents import AgentServer, JobContext, cli
from livekit.agents.voice import AgentSession
from livekit.plugins import openai

from agent.base import SessionData
from agent.db import load_agent
from agent.factory import build_agents, get_entry_point

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shravann.worker")

server = AgentServer()


def _agent_id_from_room(room_name: str) -> str | None:
    """Parse agent_id from room name. API uses session-{agentID}-{timestamp}."""
    prefix = "session-"
    if not room_name.startswith(prefix):
        return None
    rest = room_name[len(prefix) :]
    parts = rest.rsplit("-", 1)
    if len(parts) != 2 or not parts[1].isdigit():
        return None
    return parts[0] or None


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    room_meta = ctx.room.metadata or "{}"
    try:
        meta = json.loads(room_meta)
    except json.JSONDecodeError:
        meta = {}

    agent_id = meta.get("agent_id")
    if not agent_id and ctx.room.name:
        agent_id = _agent_id_from_room(ctx.room.name)
    if not agent_id:
        logger.error("No agent_id in room metadata or room name: metadata=%s room=%s", room_meta, ctx.room.name)
        return

    logger.info("session start — agent_id=%s room=%s", agent_id, ctx.room.name)

    agent_config = load_agent(agent_id)
    if not agent_config.is_active:
        logger.warning("Agent %s is not active, skipping", agent_id)
        return
    if not agent_config.participants:
        logger.warning("Agent %s has no participants, skipping", agent_id)
        return

    agents = build_agents(agent_config)
    entry = get_entry_point(agent_config, agents)

    userdata = SessionData(agent_id=agent_id, agents=agents)

    # OpenAI Realtime API: speech-to-speech (no separate STT/TTS/Cartesia/Deepgram)
    session = AgentSession[SessionData](
        userdata=userdata,
        llm=openai.realtime.RealtimeModel(voice="alloy"),
        max_tool_steps=5,
    )

    logger.info(
        "starting session with entry=%s, %d participants",
        entry._participant_name if hasattr(entry, "_participant_name") else "?",
        len(agents),
    )

    await session.start(agent=entry, room=ctx.room)

    # Trigger initial greeting so the agent speaks first (user hears something right away)
    await session.generate_reply(instructions="Greet the user briefly and ask how you can help.")

if __name__ == "__main__":
    cli.run_app(server)
