"""Base agent with shared on_enter logic and handoff mechanism."""

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import yaml

from livekit.agents.voice import Agent, AgentSession

if TYPE_CHECKING:
    from livekit.agents.voice import RunContext

logger = logging.getLogger("shravann.agent")


@dataclass
class SessionData:
    """Shared state across all participants in a session."""

    agent_id: str = ""
    agents: dict[str, Agent] = field(default_factory=dict)
    prev_agent: Agent | None = None
    context: dict = field(default_factory=dict)

    def summarize(self) -> str:
        return yaml.dump(self.context) if self.context else ""


class BaseAgent(Agent):
    """Common base for all dynamically-created participants."""

    async def on_enter(self) -> None:
        userdata: SessionData = self.session.userdata
        chat_ctx = self.chat_ctx.copy()

        if isinstance(userdata.prev_agent, Agent):
            prev_ctx = userdata.prev_agent.chat_ctx.copy(
                exclude_instructions=True,
                exclude_function_call=False,
                exclude_handoff=True,
                exclude_config_update=True,
            ).truncate(max_items=6)
            existing_ids = {item.id for item in chat_ctx.items}
            items_copy = [item for item in prev_ctx.items if item.id not in existing_ids]
            chat_ctx.items.extend(items_copy)

        summary = userdata.summarize()
        if summary:
            chat_ctx.add_message(
                role="system",
                content=f"Current session context:\n{summary}",
            )

        await self.update_chat_ctx(chat_ctx)
        self.session.generate_reply(tool_choice="none")

    async def transfer_to(self, target_role: str, context: "RunContext[SessionData]") -> tuple[Agent, str]:
        userdata = context.userdata
        current_agent = context.session.current_agent
        next_agent = userdata.agents[target_role]
        userdata.prev_agent = current_agent
        return next_agent, f"Transferring to {target_role}."
