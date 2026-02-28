"""Shravann Agent Worker — LiveKit agent server that dynamically loads
agent configurations from Postgres at session start."""

import json
import logging

from dotenv import load_dotenv

from livekit.agents import AgentServer, JobContext, cli
from livekit.agents.voice import AgentSession
from livekit.plugins import deepgram, openai, silero, cartesia

from agent.base import SessionData
from agent.db import load_agent
from agent.factory import build_agents, get_entry_point

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shravann.worker")

server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    room_meta = ctx.room.metadata or "{}"
    try:
        meta = json.loads(room_meta)
    except json.JSONDecodeError:
        meta = {}

    agent_id = meta.get("agent_id")
    if not agent_id:
        logger.error("No agent_id in room metadata: %s", room_meta)
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

    session = AgentSession[SessionData](
        userdata=userdata,
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        max_tool_steps=5,
    )

    logger.info(
        "starting session with entry=%s, %d participants",
        entry._participant_name if hasattr(entry, "_participant_name") else "?",
        len(agents),
    )

    await session.start(agent=entry, room=ctx.room)


if __name__ == "__main__":
    cli.run_app(server)
