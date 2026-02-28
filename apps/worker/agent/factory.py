"""Build Agent instances dynamically from database config."""

import logging
from typing import Any

from livekit.agents.llm import function_tool
from livekit.agents.voice import Agent, RunContext
from livekit.plugins import openai

from .base import BaseAgent, SessionData
from .db import AgentRow, ParticipantRow

logger = logging.getLogger("shravann.factory")


def get_llm(model: str) -> Any:
    """Return an LLM instance based on model name."""
    if model.startswith("claude"):
        # Future: add Anthropic support
        logger.warning("Anthropic not yet supported, falling back to openai")
        return openai.LLM(model="gpt-4o")
    return openai.LLM(model=model, parallel_tool_calls=False)


def get_tts(provider: str | None, voice_id: str | None) -> Any:
    """Return a TTS instance. With Realtime session the pipeline uses OpenAI Realtime (speech-to-speech); this is only used if session does not use Realtime."""
    return openai.TTS()


def _make_handoff_tool(target_role: str, description: str):
    """Create a handoff function tool for a target participant.

    The description becomes the tool's docstring, which the LLM uses
    to decide when to invoke the handoff.
    """

    @function_tool(name=f"to_{target_role}")
    async def handoff(context: RunContext[SessionData]) -> tuple[Agent, str]:
        curr: BaseAgent = context.session.current_agent
        return await curr.transfer_to(target_role, context)

    handoff.__doc__ = description or f"Transfer to the {target_role} agent."
    return handoff


def build_agents(agent_config: AgentRow) -> dict[str, Agent]:
    """Turn database rows into live Agent instances with handoff tools."""
    participants = agent_config.participants
    agents: dict[str, Agent] = {}

    for p in participants:
        handoff_tools = []
        for target in participants:
            if target.role != p.role:
                tool = _make_handoff_tool(target.role, target.handoff_description)
                handoff_tools.append(tool)

        instructions = p.system_prompt
        if agent_config.system_prompt:
            instructions = f"{agent_config.system_prompt}\n\n{instructions}"

        agent = BaseAgent(
            instructions=instructions,
            llm=get_llm(p.model),
            tts=get_tts(p.voice_provider, p.voice_id),
            tools=handoff_tools,
        )
        agent._participant_role = p.role
        agent._participant_name = p.name
        agents[p.role] = agent

        logger.info(
            "built participant: %s (role=%s, model=%s, entry=%s)",
            p.name,
            p.role,
            p.model,
            p.is_entry_point,
        )

    return agents


def get_entry_point(agent_config: AgentRow, agents: dict[str, Agent]) -> Agent:
    """Return the entry-point agent."""
    for p in agent_config.participants:
        if p.is_entry_point and p.role in agents:
            return agents[p.role]
    # Fallback: first participant
    first_role = agent_config.participants[0].role
    return agents[first_role]
