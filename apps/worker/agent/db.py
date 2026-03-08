"""Load agent config and participants from Postgres."""

import json
import logging
import os
from dataclasses import dataclass, field

import psycopg

from .crypto import decrypt, get_encryption_key

logger = logging.getLogger("shravann.agent.db")


@dataclass
class ParticipantRow:
    id: str
    agent_id: str
    name: str
    role: str
    system_prompt: str
    model: str
    voice_provider: str | None
    voice_id: str | None
    voice_config: dict
    handoff_description: str
    is_entry_point: bool
    position: int


@dataclass
class AgentRow:
    id: str
    project_id: str
    name: str
    slug: str
    system_prompt: str
    model: str
    language: str
    is_active: bool
    participants: list[ParticipantRow] = field(default_factory=list)


def get_dsn() -> str:
    return os.environ.get("DATABASE_URL", "postgres://postgres@localhost:5432/db_shravann?sslmode=disable")


def load_agent(agent_id: str) -> AgentRow:
    """Load an agent and all its participants from the database."""
    dsn = get_dsn()
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, name, slug, system_prompt, model, language, is_active
                FROM agents WHERE id = %s
                """,
                (agent_id,),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Agent {agent_id} not found")

            agent = AgentRow(
                id=str(row[0]),
                project_id=str(row[1]),
                name=row[2],
                slug=row[3],
                system_prompt=row[4],
                model=row[5],
                language=row[6],
                is_active=row[7],
            )

            cur.execute(
                """
                SELECT id, agent_id, name, role, system_prompt, model,
                       voice_provider, voice_id, voice_config,
                       handoff_description, is_entry_point, position
                FROM agent_participants
                WHERE agent_id = %s
                ORDER BY position ASC, created_at ASC
                """,
                (agent_id,),
            )
            for r in cur.fetchall():
                vc = r[8]
                if isinstance(vc, str):
                    vc = json.loads(vc)
                agent.participants.append(
                    ParticipantRow(
                        id=str(r[0]),
                        agent_id=str(r[1]),
                        name=r[2],
                        role=r[3],
                        system_prompt=r[4],
                        model=r[5],
                        voice_provider=r[6],
                        voice_id=r[7],
                        voice_config=vc or {},
                        handoff_description=r[9],
                        is_entry_point=r[10],
                        position=r[11],
                    )
                )

    return agent


def load_project_api_keys(project_id: str) -> dict[str, str]:
    """Load and decrypt API keys for a project. Returns {provider: plaintext_key}."""
    dsn = get_dsn()
    enc_key = get_encryption_key()
    keys: dict[str, str] = {}
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT provider, encrypted_key FROM project_api_keys WHERE project_id = %s",
                (project_id,),
            )
            for provider, encrypted_key in cur.fetchall():
                try:
                    raw = encrypted_key
                    if isinstance(raw, memoryview):
                        raw = bytes(raw)
                    plaintext = decrypt(raw, enc_key)
                    keys[provider] = plaintext.decode("utf-8")
                except Exception:
                    logger.warning("Failed to decrypt key for provider %s", provider, exc_info=True)
    return keys
