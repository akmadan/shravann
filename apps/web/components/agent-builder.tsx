"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Node,
  type NodeProps,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Plus,
  X,
  Bot,
  Crown,
  ArrowLeft,
  Save,
  Sparkles,
  ArrowLeftRight,
  Link2,
  Settings,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  createAgent,
  createParticipant,
  updateAgent,
  updateParticipant as updateParticipantApi,
  deleteAgent,
  deleteParticipant,
  listForms,
  listAPIKeys,
  type Project,
  type Agent,
  type Participant,
  type Form,
  type APIKeyEntry,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────

type AgentProvider = "openai" | "google";

interface ParticipantDraft {
  tempId: string;
  parentId: string | null;
  name: string;
  role: string;
  system_prompt: string;
  voice_id: string;
  handoff_description: string;
  is_entry_point: boolean;
  position: number;
}

type ParticipantNodeData = {
  participant: ParticipantDraft;
  childCount: number;
};

// ─── Constants ────────────────────────────────────────────────────

const NODE_W = 170;
const NODE_H = 100;
const GAP_X = 260;
const GAP_Y = 140;
const MIDLINE_Y = 350;

const SPECIAL_CONFIG = "__config__";
const SPECIAL_FORM = "__form__";

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "#3b82f6", strokeWidth: 2 },
  animated: true,
};

const INPUT =
  "w-full rounded-md border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-white placeholder-[#52525b] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30";

// ─── Helpers ──────────────────────────────────────────────────────

function makeTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function defaultSupervisor(): ParticipantDraft {
  return {
    tempId: makeTempId(),
    parentId: null,
    name: "Supervisor",
    role: "supervisor",
    system_prompt:
      "You are the supervisor agent. Greet the user and route them to the appropriate specialist based on their needs.",
    voice_id: "",
    handoff_description: "",
    is_entry_point: true,
    position: 0,
  };
}

function defaultChild(parentId: string, position: number): ParticipantDraft {
  return {
    tempId: makeTempId(),
    parentId,
    name: "",
    role: "",
    system_prompt: "",
    voice_id: "",
    handoff_description: "",
    is_entry_point: false,
    position,
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

// ─── Pipeline Layout ──────────────────────────────────────────────

function buildPipelineLayout(participants: Participant[]): {
  initialNodes: Node[];
  initialEdges: Edge[];
} {
  const nodes: Node[] = [];
  const allEdges: Edge[] = [];

  nodes.push({
    id: SPECIAL_CONFIG,
    type: "config",
    position: { x: 0, y: MIDLINE_Y - NODE_H / 2 },
    data: {},
    draggable: false,
  });

  nodes.push({
    id: SPECIAL_FORM,
    type: "form",
    position: { x: GAP_X, y: MIDLINE_Y - NODE_H / 2 },
    data: {},
    draggable: false,
  });

  allEdges.push({
    id: "pipeline-config-form",
    source: SPECIAL_CONFIG,
    target: SPECIAL_FORM,
    ...defaultEdgeOptions,
  });

  if (participants.length === 0) {
    const sup = defaultSupervisor();
    nodes.push({
      id: sup.tempId,
      type: "participant",
      position: { x: 2 * GAP_X, y: MIDLINE_Y - NODE_H / 2 },
      data: { participant: sup, childCount: 0 } as ParticipantNodeData,
    });
    allEdges.push({
      id: `pipeline-form-${sup.tempId}`,
      source: SPECIAL_FORM,
      target: sup.tempId,
      ...defaultEdgeOptions,
    });
    return { initialNodes: nodes, initialEdges: allEdges };
  }

  const byId = new Map(participants.map((p) => [p.id, p]));
  const participantEdges: Edge[] = [];
  for (const p of participants) {
    for (const parentId of p.parent_participant_ids || []) {
      if (byId.has(parentId)) {
        participantEdges.push({
          id: `e-${parentId}-${p.id}`,
          source: parentId,
          target: p.id,
          ...defaultEdgeOptions,
        });
      }
    }
  }

  const childCount = new Map<string, number>();
  for (const e of participantEdges) {
    childCount.set(e.source, (childCount.get(e.source) ?? 0) + 1);
  }

  const roots = participants.filter(
    (p) => (p.parent_participant_ids?.length ?? 0) === 0
  );
  if (roots.length === 0) {
    const entry = participants.find((p) => p.is_entry_point) ?? participants[0];
    roots.push(entry);
  }

  // BFS to assign levels
  const levelOf = new Map<string, number>();
  const queue: { id: string; level: number }[] = roots.map((r) => ({
    id: r.id,
    level: 0,
  }));
  for (const r of queue) levelOf.set(r.id, r.level);

  let i = 0;
  while (i < queue.length) {
    const { id, level } = queue[i++];
    const children = participantEdges
      .filter((e) => e.source === id)
      .map((e) => e.target);
    for (const cid of children) {
      if (!levelOf.has(cid)) {
        levelOf.set(cid, level + 1);
        queue.push({ id: cid, level: level + 1 });
      }
    }
  }
  for (const p of participants) {
    if (!levelOf.has(p.id)) levelOf.set(p.id, 0);
  }

  // Group by level
  const byLevel = new Map<number, string[]>();
  for (const p of participants) {
    const l = levelOf.get(p.id) ?? 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(p.id);
  }

  // Position participant nodes (columns offset by +2 for config/form)
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  for (const level of levels) {
    const ids = byLevel.get(level)!;
    const x = (level + 2) * GAP_X;
    const totalHeight = (ids.length - 1) * GAP_Y;
    const startY = MIDLINE_Y - totalHeight / 2 - NODE_H / 2;

    ids.forEach((id, idx) => {
      const p = byId.get(id)!;
      const draft: ParticipantDraft = {
        tempId: p.id,
        parentId: null,
        name: p.name,
        role: p.role,
        system_prompt: p.system_prompt ?? "",
        voice_id: p.voice_id ?? "",
        handoff_description: p.handoff_description ?? "",
        is_entry_point: p.is_entry_point,
        position: p.position,
      };
      nodes.push({
        id: p.id,
        type: "participant",
        position: { x, y: startY + idx * GAP_Y },
        data: {
          participant: draft,
          childCount: childCount.get(id) ?? 0,
        } as ParticipantNodeData,
      });
    });
  }

  // Connect form → root participants
  for (const root of roots) {
    allEdges.push({
      id: `pipeline-form-${root.id}`,
      source: SPECIAL_FORM,
      target: root.id,
      ...defaultEdgeOptions,
    });
  }

  allEdges.push(...participantEdges);
  return { initialNodes: nodes, initialEdges: allEdges };
}

// ─── Context ──────────────────────────────────────────────────────

type BuilderContextValue = {
  onAddChild: (parentId: string) => void;
  onRemove: (nodeId: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateParticipant: (nodeId: string, patch: Partial<ParticipantDraft>) => void;
  agentName: string;
  selectedFormName: string;
  provider: AgentProvider;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used inside AgentBuilder");
  return ctx;
}

// ─── Node Components ──────────────────────────────────────────────

function ConfigNodeComponent({ id }: NodeProps) {
  const { agentName, selectedId, setSelectedId } = useBuilder();
  const isSelected = selectedId === id;

  return (
    <>
      <div
        onClick={() => setSelectedId(id)}
        className={`nodrag cursor-pointer rounded-lg border p-3 shadow-lg transition-all ${
          isSelected
            ? "border-[#3b82f6] ring-2 ring-[#3b82f6]/30"
            : "border-[#27272a] hover:border-[#3f3f46]"
        }`}
        style={{ width: NODE_W, height: NODE_H, background: "#18181b" }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-violet-400">
            <Settings size={13} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
            Config
          </span>
        </div>
        <p className="truncate text-[13px] font-medium text-white">
          {agentName || "Configure"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!-right-1 !w-2.5 !h-2.5 !border-2 !border-[#3b82f6] !bg-[#18181b]"
      />
    </>
  );
}

function FormNodeComponent({ id }: NodeProps) {
  const { selectedFormName, selectedId, setSelectedId } = useBuilder();
  const isSelected = selectedId === id;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-1 !w-2.5 !h-2.5 !border-2 !border-[#3b82f6] !bg-[#18181b]"
      />
      <div
        onClick={() => setSelectedId(id)}
        className={`nodrag cursor-pointer rounded-lg border p-3 shadow-lg transition-all ${
          isSelected
            ? "border-[#3b82f6] ring-2 ring-[#3b82f6]/30"
            : "border-[#27272a] hover:border-[#3f3f46]"
        }`}
        style={{ width: NODE_W, height: NODE_H, background: "#18181b" }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
            <FileText size={13} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
            Form
          </span>
        </div>
        <p className="truncate text-[13px] font-medium text-white">
          {selectedFormName || "No Form"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!-right-1 !w-2.5 !h-2.5 !border-2 !border-[#3b82f6] !bg-[#18181b]"
      />
    </>
  );
}

function ParticipantNodeComponent({
  data,
  selected,
  id,
}: NodeProps<Node<ParticipantNodeData, "participant">>) {
  const { onAddChild, onRemove, selectedId, setSelectedId } = useBuilder();
  const p = data.participant;
  const isEntry = p.is_entry_point;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-1 !w-2.5 !h-2.5 !border-2 !border-[#3b82f6] !bg-[#18181b] hover:!scale-125 hover:!bg-[#3b82f6]/20"
      />
      <div
        onClick={() => setSelectedId(id)}
        className={`nodrag group flex h-full w-full cursor-pointer flex-col rounded-lg border bg-[#18181b] p-3 shadow-lg transition-all ${
          selected || selectedId === id
            ? "border-[#3b82f6] ring-2 ring-[#3b82f6]/30"
            : "border-[#27272a] hover:border-[#3f3f46]"
        }`}
        style={{ width: NODE_W, minHeight: NODE_H }}
      >
        {!isEntry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className="absolute -right-1.5 -top-1.5 z-10 hidden h-5 w-5 items-center justify-center rounded-full border border-[#27272a] bg-[#18181b] text-[#71717a] hover:border-red-500/50 hover:text-red-400 group-hover:flex"
          >
            <X size={10} />
          </button>
        )}

        <div className="mb-1.5 flex items-center gap-2">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              isEntry
                ? "bg-amber-500/20 text-amber-400"
                : "bg-[#27272a] text-[#a1a1aa]"
            }`}
          >
            {isEntry ? <Crown size={13} /> : <Bot size={13} />}
          </div>
          {isEntry && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-400">
              Entry
            </span>
          )}
        </div>

        <p className="truncate text-[13px] font-medium text-white">
          {p.name || "Untitled"}
        </p>
        <p className="truncate text-[11px] text-[#71717a]">
          {p.role || "no role"}
        </p>

        <div className="mt-auto flex items-center justify-between pt-1.5">
          {data.childCount > 0 && (
            <span className="text-[10px] text-[#52525b]">
              {data.childCount} sub
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(id);
            }}
            className="nodrag ml-auto flex items-center gap-1 rounded border border-dashed border-[#3f3f46] px-1.5 py-0.5 text-[10px] text-[#71717a] hover:border-[#3b82f6] hover:text-[#3b82f6]"
          >
            <Plus size={10} /> Add
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!-right-1 !w-2.5 !h-2.5 !border-2 !border-[#3b82f6] !bg-[#18181b] hover:!scale-125 hover:!bg-[#3b82f6]/20"
      />
    </>
  );
}

const nodeTypes = {
  config: ConfigNodeComponent,
  form: FormNodeComponent,
  participant: ParticipantNodeComponent,
};

// ─── Inner builder (uses React Flow hooks) ──────────────────────

function AgentBuilderInner({
  projects,
  preselectedProject,
  userId,
  agentId,
  initialAgent,
  initialParticipants,
}: {
  projects: Project[];
  preselectedProject: string;
  userId: string;
  agentId?: string;
  initialAgent?: Agent | null;
  initialParticipants?: Participant[] | null;
}) {
  const router = useRouter();
  const { getNode } = useReactFlow();
  const isEditMode = Boolean(agentId && initialAgent);
  const initialParticipantIds = useMemo(
    () => initialParticipants?.map((p) => p.id) ?? [],
    [initialParticipants]
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    return buildPipelineLayout(initialParticipants ?? []);
  }, [initialParticipants]);

  const [projectId, setProjectId] = useState(
    () =>
      initialAgent?.project_id ||
      preselectedProject ||
      projects[0]?.id ||
      ""
  );
  const [agentName, setAgentName] = useState(() => initialAgent?.name ?? "");
  const [agentSlug, setAgentSlug] = useState(() => initialAgent?.slug ?? "");
  const [sharedContext, setSharedContext] = useState(
    () => initialAgent?.system_prompt ?? ""
  );
  const [language, setLanguage] = useState("en");
  const [provider, setProvider] = useState<AgentProvider>(() => {
    const m = initialAgent?.model ?? "openai";
    return m === "google" ? "google" : "openai";
  });
  const [selectedFormId, setSelectedFormId] = useState<string>(
    () => initialAgent?.form_id ?? ""
  );
  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const [projectAPIKeys, setProjectAPIKeys] = useState<APIKeyEntry[]>([]);

  useEffect(() => {
    if (projectId) {
      listForms(projectId, userId)
        .then((res) => setAvailableForms(res.forms ?? []))
        .catch(() => setAvailableForms([]));
      listAPIKeys(projectId, userId)
        .then((res) => setProjectAPIKeys(res.api_keys ?? []))
        .catch(() => setProjectAPIKeys([]));
    } else {
      setAvailableForms([]);
      setProjectAPIKeys([]);
    }
  }, [projectId, userId]);

  const providerKeyConfigured = projectAPIKeys.some(
    (k) => k.provider === provider && k.is_set
  );

  const selectedFormName = useMemo(() => {
    if (!selectedFormId) return "";
    return availableForms.find((f) => f.id === selectedFormId)?.name ?? "";
  }, [selectedFormId, availableForms]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isActive, setIsActive] = useState(
    () => initialAgent?.is_active ?? true
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Only follow participant edges (skip pipeline-* edges)
  const getDescendantIds = useCallback(
    (nodeId: string): Set<string> => {
      const out = new Set<string>();
      const stack = [nodeId];
      while (stack.length > 0) {
        const id = stack.pop()!;
        edges.forEach((e) => {
          if (e.source === id && !e.id.startsWith("pipeline-")) {
            out.add(e.target);
            stack.push(e.target);
          }
        });
      }
      return out;
    },
    [edges]
  );

  // Highlight outgoing edges from selected node in green
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id.startsWith("pipeline-")) return e;
        const isHighlighted =
          selectedId != null &&
          selectedId !== SPECIAL_CONFIG &&
          selectedId !== SPECIAL_FORM &&
          e.source === selectedId;
        const style = isHighlighted
          ? { stroke: "#22c55e", strokeWidth: 2.5 }
          : { stroke: "#3b82f6", strokeWidth: 2 };
        if (
          e.style?.stroke === style.stroke &&
          e.style?.strokeWidth === style.strokeWidth
        )
          return e;
        return { ...e, style };
      })
    );
  }, [selectedId, setEdges]);

  const onAddChild = useCallback(
    (parentId: string) => {
      const parent = getNode(parentId);
      if (!parent) return;
      const siblings = edges.filter(
        (e) => e.source === parentId && !e.id.startsWith("pipeline-")
      );
      const newParticipant = defaultChild(parentId, siblings.length);

      const x = parent.position.x + GAP_X;

      setNodes((nds) => {
        // Find the bottommost node already in this column to avoid overlap
        const nodesInColumn = nds.filter(
          (n) => Math.abs(n.position.x - x) < NODE_W / 2
        );
        let y: number;
        if (nodesInColumn.length === 0) {
          y = parent.position.y;
        } else {
          const maxY = Math.max(...nodesInColumn.map((n) => n.position.y));
          y = maxY + GAP_Y;
        }

        const updated = nds.map((n) =>
          n.id === parentId && n.type === "participant"
            ? {
                ...n,
                data: {
                  ...n.data,
                  childCount:
                    (n.data as ParticipantNodeData).childCount + 1,
                },
              }
            : n
        );
        return [
          ...updated,
          {
            id: newParticipant.tempId,
            type: "participant" as const,
            position: { x, y },
            data: {
              participant: newParticipant,
              childCount: 0,
            } as ParticipantNodeData,
          },
        ];
      });
      setEdges((eds) => [
        ...eds,
        {
          id: `e-${parentId}-${newParticipant.tempId}`,
          source: parentId,
          target: newParticipant.tempId,
          ...defaultEdgeOptions,
        },
      ]);
      setSelectedId(newParticipant.tempId);
    },
    [getNode, edges, setNodes, setEdges]
  );

  const onRemove = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node || node.type !== "participant") return;
      if ((node.data as ParticipantNodeData).participant.is_entry_point) return;
      const toDelete = new Set([nodeId, ...getDescendantIds(nodeId)]);
      setNodes((nds) => nds.filter((n) => !toDelete.has(n.id)));
      setEdges((eds) =>
        eds.filter(
          (e) => !toDelete.has(e.source) && !toDelete.has(e.target)
        )
      );
      if (selectedId && toDelete.has(selectedId)) setSelectedId(null);
    },
    [getNode, getDescendantIds, setNodes, setEdges, selectedId]
  );

  const updateParticipant = useCallback(
    (nodeId: string, patch: Partial<ParticipantDraft>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === "participant"
            ? {
                ...n,
                data: {
                  ...n.data,
                  participant: {
                    ...(n.data as ParticipantNodeData).participant,
                    ...patch,
                  },
                },
              }
            : n
        )
      );
    },
    [setNodes]
  );

  const builderContext = useMemo<BuilderContextValue>(
    () => ({
      onAddChild,
      onRemove,
      selectedId,
      setSelectedId,
      updateParticipant,
      agentName,
      selectedFormName,
      provider,
    }),
    [
      onAddChild,
      onRemove,
      selectedId,
      setSelectedId,
      updateParticipant,
      agentName,
      selectedFormName,
      provider,
    ]
  );

  const selectedParticipant = useMemo(() => {
    if (!selectedId || selectedId === SPECIAL_CONFIG || selectedId === SPECIAL_FORM)
      return null;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node || node.type !== "participant") return null;
    return (node.data as ParticipantNodeData).participant;
  }, [nodes, selectedId]);

  // Save -- only operates on participant nodes, filtering out pipeline edges
  const handleSave = useCallback(async () => {
    if (!projectId) {
      setError("Select a project");
      return;
    }
    if (!agentName || !agentSlug) {
      setError("Agent name is required");
      return;
    }

    const participantNodes = nodes.filter((n) => n.type === "participant");
    const participantsList = participantNodes.map((n) => ({
      ...(n.data as ParticipantNodeData).participant,
      parentIds: edges
        .filter((e) => e.target === n.id && !e.id.startsWith("pipeline-"))
        .map((e) => e.source),
    }));

    const root = participantsList.find((p) => p.is_entry_point);
    if (!root) {
      setError("An entry-point participant is required");
      return;
    }
    for (const p of participantsList) {
      if (!p.name || !p.role) {
        setError(
          `Participant "${p.name || "(unnamed)"}" needs a name and role`
        );
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const formId = selectedFormId || undefined;
      const agent = isEditMode
        ? await updateAgent(agentId!, {
            name: agentName,
            slug: agentSlug,
            system_prompt: sharedContext,
            model: provider,
            language,
            form_id: selectedFormId || "",
          })
        : await createAgent(
            projectId,
            {
              name: agentName,
              slug: agentSlug,
              system_prompt: sharedContext,
              model: provider,
              language,
              form_id: formId,
            },
            userId
          );

      const currentNodeIds = new Set(participantNodes.map((n) => n.id));
      const tempToReal = new Map<string, string>();
      for (const n of participantNodes) {
        if (isUuid(n.id)) tempToReal.set(n.id, n.id);
      }

      if (isEditMode) {
        for (const n of participantNodes) {
          const p = (n.data as ParticipantNodeData).participant;
          const parentIds = edges
            .filter(
              (e) => e.target === n.id && !e.id.startsWith("pipeline-")
            )
            .map((e) => e.source);
          const realParentIds = parentIds
            .map((id) => tempToReal.get(id))
            .filter((id): id is string => id != null);
          if (isUuid(n.id)) {
            await updateParticipantApi(agent.id, n.id, {
              name: p.name,
              role: p.role,
              system_prompt: p.system_prompt,
              voice_id: p.voice_id || undefined,
              handoff_description: p.handoff_description,
              is_entry_point: p.is_entry_point,
              position: p.position,
              parent_participant_ids: realParentIds,
            });
          }
        }
        const toDelete = initialParticipantIds.filter(
          (id) => !currentNodeIds.has(id)
        );
        for (const id of toDelete) {
          await deleteParticipant(agent.id, id);
        }
      }

      const newParticipantIds = participantsList
        .filter((p) => !isUuid(p.tempId))
        .map((p) => p.tempId);
      if (newParticipantIds.length > 0) {
        const remaining = new Set(newParticipantIds);
        while (remaining.size > 0) {
          const ready = participantsList.filter(
            (p) =>
              remaining.has(p.tempId) &&
              p.parentIds.every((pid: string) => tempToReal.has(pid))
          );
          if (ready.length === 0) {
            setError("Circular parent reference between participants");
            setSaving(false);
            return;
          }
          for (const p of ready) {
            remaining.delete(p.tempId);
            const realParentIds = p.parentIds
              .map((id: string) => tempToReal.get(id))
              .filter((id: string | undefined): id is string => id != null);
            const created = await createParticipant(agent.id, {
              name: p.name,
              role: p.role,
              system_prompt: p.system_prompt,
              voice_id: p.voice_id || undefined,
              handoff_description: p.handoff_description,
              is_entry_point: p.is_entry_point,
              position: p.position,
              parent_participant_ids: realParentIds,
            });
            tempToReal.set(p.tempId, created.id);
          }
        }
      }

      router.push(`/agents/${agent.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setSaving(false);
    }
  }, [
    isEditMode,
    agentId,
    projectId,
    agentName,
    agentSlug,
    sharedContext,
    provider,
    language,
    selectedFormId,
    userId,
    nodes,
    edges,
    initialParticipantIds,
    router,
  ]);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const src = connection.source;
      const tgt = connection.target;
      if (src === tgt) return;
      if (src === SPECIAL_CONFIG || src === SPECIAL_FORM) return;
      if (tgt === SPECIAL_CONFIG || tgt === SPECIAL_FORM) return;
      if (edges.some((e) => e.source === src && e.target === tgt)) return;

      setEdges((eds) =>
        addEdge({ ...connection, ...defaultEdgeOptions }, eds)
      );
      setNodes((nds) =>
        nds.map((n) =>
          n.id === src && n.type === "participant"
            ? {
                ...n,
                data: {
                  ...n.data,
                  childCount:
                    (n.data as ParticipantNodeData).childCount + 1,
                },
              }
            : n
        )
      );
    },
    [edges, setNodes, setEdges]
  );

  const participantCount = nodes.filter(
    (n) => n.type === "participant"
  ).length;

  return (
    <BuilderContext.Provider value={builderContext}>
      <div className="flex h-full flex-col bg-[#09090b]">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#27272a] px-4 py-2.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[13px] text-[#71717a] hover:text-white"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="h-4 w-px bg-[#27272a]" />
            <h1 className="text-sm font-medium text-white">
              {isEditMode
                ? `Edit: ${agentName || "Agent"}`
                : "Agent Builder"}
            </h1>
            {participantCount > 1 && (
              <>
                <div className="h-4 w-px bg-[#27272a]" />
                <span className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                  <ArrowLeftRight size={11} />
                  All participants can hand off to each other
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-[13px] text-red-400">{error}</span>
            )}
            {isEditMode && (
              <>
                <button
                  onClick={() => {
                    if (!agentId) return;
                    const base =
                      typeof process !== "undefined" &&
                      process.env.NEXT_PUBLIC_SESSION_APP_URL
                        ? process.env.NEXT_PUBLIC_SESSION_APP_URL
                        : "";
                    const url = base
                      ? `${base.replace(/\/$/, "")}/${agentId}`
                      : agentId;
                    navigator.clipboard.writeText(url);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-[#a1a1aa] hover:bg-white/[0.1] hover:text-white"
                  title="Copy session link"
                >
                  <Link2 size={12} />
                  Copy session link
                </button>
                <button
                  onClick={async () => {
                    if (!agentId) return;
                    await updateAgent(agentId, { is_active: !isActive });
                    setIsActive(!isActive);
                  }}
                  className="rounded-md bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-[#a1a1aa] hover:bg-white/[0.1] hover:text-white"
                >
                  {isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={async () => {
                    if (
                      !agentId ||
                      !confirm("Delete this agent? This cannot be undone.")
                    )
                      return;
                    await deleteAgent(agentId);
                    router.push("/agents");
                  }}
                  className="rounded-md bg-red-500/10 px-3 py-1.5 text-[13px] font-medium text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-white px-3.5 py-1.5 text-[13px] font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save Agent"}
            </button>
          </div>
        </div>

        {!providerKeyConfigured && projectId && (
          <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {provider === "google" ? "Google" : "OpenAI"} API key is not
              configured for this project. Agents will not work without it.{" "}
              <a
                href="/settings"
                className="font-medium underline hover:text-amber-300"
              >
                Go to Settings
              </a>
            </span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* React Flow canvas */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={1.5}
              colorMode="dark"
              proOptions={{ hideAttribution: true }}
              className="bg-[#09090b]"
              connectOnClick={false}
              connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#27272a"
                className="bg-[#09090b]"
              />
              <Controls
                className="!border-[#27272a] !bg-[#18181b] !text-[#a1a1aa] [&>button]:!border-[#27272a] [&>button]:hover:!bg-[#27272a]"
                position="bottom-left"
              />
            </ReactFlow>
          </div>

          {/* Right panel -- polymorphic based on selectedId */}
          {selectedId === null && <PanelEmpty />}
          {selectedId === SPECIAL_CONFIG && (
            <ConfigPanel
              agentName={agentName}
              setAgentName={(v) => {
                setAgentName(v);
                setAgentSlug(makeSlug(v));
              }}
              agentSlug={agentSlug}
              projectId={projectId}
              setProjectId={setProjectId}
              projects={projects}
              provider={provider}
              setProvider={setProvider}
              sharedContext={sharedContext}
              setSharedContext={setSharedContext}
              onClose={() => setSelectedId(null)}
            />
          )}
          {selectedId === SPECIAL_FORM && (
            <FormPanel
              selectedFormId={selectedFormId}
              setSelectedFormId={setSelectedFormId}
              availableForms={availableForms}
              onClose={() => setSelectedId(null)}
            />
          )}
          {selectedId !== null &&
            selectedId !== SPECIAL_CONFIG &&
            selectedId !== SPECIAL_FORM && (
              <ParticipantPanel
                selected={selectedParticipant}
                onUpdate={(patch) => {
                  if (selectedId) updateParticipant(selectedId, patch);
                }}
                onClose={() => setSelectedId(null)}
              />
            )}
        </div>
      </div>
    </BuilderContext.Provider>
  );
}

// ─── Panel Components ─────────────────────────────────────────────

function PanelEmpty() {
  return (
    <div className="relative z-10 flex w-80 shrink-0 flex-col items-center justify-center border-l border-[#27272a] bg-[#09090b] p-6">
      <Sparkles size={24} className="mb-3 text-[#27272a]" />
      <p className="text-center text-[13px] text-[#52525b]">
        Select a step to configure
      </p>
    </div>
  );
}

function ConfigPanel({
  agentName,
  setAgentName,
  agentSlug,
  projectId,
  setProjectId,
  projects,
  provider,
  setProvider,
  sharedContext,
  setSharedContext,
  onClose,
}: {
  agentName: string;
  setAgentName: (v: string) => void;
  agentSlug: string;
  projectId: string;
  setProjectId: (v: string) => void;
  projects: Project[];
  provider: AgentProvider;
  setProvider: (v: AgentProvider) => void;
  sharedContext: string;
  setSharedContext: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="relative z-10 flex w-80 shrink-0 flex-col border-l border-[#27272a] bg-[#09090b]">
      <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-500/20 text-violet-400">
            <Settings size={12} />
          </div>
          <span className="text-[13px] font-medium text-white">
            Agent Config
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#71717a] hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Agent Name">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Restaurant Assistant"
            className={INPUT}
          />
          {agentSlug && (
            <p className="mt-1 text-[10px] text-[#52525b]">
              slug: {agentSlug}
            </p>
          )}
        </Field>
        <Field label="Project">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={INPUT}
          >
            <option value="">Select</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Provider">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AgentProvider)}
            className={INPUT}
          >
            <option value="openai">OpenAI Realtime</option>
            <option value="google">Google Gemini Live</option>
          </select>
          <p className="mt-1 text-[10px] text-[#52525b]">
            {provider === "openai"
              ? "Uses OpenAI Realtime API for speech-to-speech"
              : "Uses Gemini Live API for speech-to-speech"}
          </p>
        </Field>
        <Field label="Shared Context">
          <textarea
            value={sharedContext}
            onChange={(e) => setSharedContext(e.target.value)}
            placeholder="Context shared with all participants..."
            rows={4}
            className={`${INPUT} resize-none`}
          />
          <p className="mt-1 text-[10px] text-[#52525b]">
            Prepended to every participant&apos;s system prompt
          </p>
        </Field>
      </div>
    </div>
  );
}

function FormPanel({
  selectedFormId,
  setSelectedFormId,
  availableForms,
  onClose,
}: {
  selectedFormId: string;
  setSelectedFormId: (v: string) => void;
  availableForms: Form[];
  onClose: () => void;
}) {
  return (
    <div className="relative z-10 flex w-80 shrink-0 flex-col border-l border-[#27272a] bg-[#09090b]">
      <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
            <FileText size={12} />
          </div>
          <span className="text-[13px] font-medium text-white">
            Session Start Form
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#71717a] hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Form Template">
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className={INPUT}
          >
            <option value="">None</option>
            {availableForms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-[#52525b]">
            Shown to the user before the voice session starts
          </p>
        </Field>
        {availableForms.length === 0 && (
          <div className="rounded-md border border-[#27272a] bg-[#18181b] px-3 py-3">
            <p className="text-[12px] text-[#71717a]">
              No forms yet.{" "}
              <a
                href="/forms/new"
                className="text-[#3b82f6] hover:underline"
              >
                Create one
              </a>{" "}
              to collect user info before sessions.
            </p>
          </div>
        )}
        {selectedFormId && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <p className="text-[11px] text-emerald-400/90">
              Users will fill out this form before joining the voice session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantPanel({
  selected,
  onUpdate,
  onClose,
}: {
  selected: ParticipantDraft | null;
  onUpdate: (patch: Partial<ParticipantDraft>) => void;
  onClose: () => void;
}) {
  const { provider } = useBuilder();

  if (!selected) {
    return <PanelEmpty />;
  }

  return (
    <div className="relative z-10 flex w-80 shrink-0 flex-col border-l border-[#27272a] bg-[#09090b]">
      <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded ${
              selected.is_entry_point
                ? "bg-amber-500/20 text-amber-400"
                : "bg-[#27272a] text-[#a1a1aa]"
            }`}
          >
            {selected.is_entry_point ? (
              <Crown size={12} />
            ) : (
              <Bot size={12} />
            )}
          </div>
          <span className="text-[13px] font-medium text-white">
            {selected.name || "Untitled"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#71717a] hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Name">
          <input
            type="text"
            value={selected.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Greeter"
            className={INPUT}
          />
        </Field>
        <Field label="Role">
          <input
            type="text"
            value={selected.role}
            onChange={(e) => onUpdate({ role: makeSlug(e.target.value) })}
            placeholder="greeter"
            className={INPUT}
          />
          <p className="mt-1 text-[10px] text-[#52525b]">
            Lowercase identifier used for handoffs
          </p>
        </Field>
        <Field label="System Prompt">
          <textarea
            value={selected.system_prompt}
            onChange={(e) => onUpdate({ system_prompt: e.target.value })}
            placeholder="You are a friendly greeter..."
            rows={5}
            className={`${INPUT} resize-none`}
          />
        </Field>
        <Field label="Handoff Description">
          <textarea
            value={selected.handoff_description}
            onChange={(e) =>
              onUpdate({ handoff_description: e.target.value })
            }
            placeholder="When should other agents hand off to this one?"
            rows={3}
            className={`${INPUT} resize-none`}
          />
        </Field>
        <Field label="Voice">
          <select
            value={selected.voice_id}
            onChange={(e) => onUpdate({ voice_id: e.target.value })}
            className={INPUT}
          >
            <option value="">Default</option>
            {provider === "google" ? (
              <>
                <option value="Puck">Puck</option>
                <option value="Charon">Charon</option>
                <option value="Zephyr">Zephyr</option>
              </>
            ) : (
              <>
                <optgroup label="Classic">
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </optgroup>
                <optgroup label="New">
                  <option value="ash">Ash</option>
                  <option value="ballad">Ballad</option>
                  <option value="coral">Coral</option>
                  <option value="sage">Sage</option>
                  <option value="verse">Verse</option>
                  <option value="marin">Marin</option>
                  <option value="cedar">Cedar</option>
                </optgroup>
              </>
            )}
          </select>
          <p className="mt-1 text-[10px] text-[#52525b]">
            Voice used for the realtime session (entry participant)
          </p>
        </Field>
        {selected.is_entry_point && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] text-amber-400/90">
              Entry-point participant. Conversations start here.
            </p>
          </div>
        )}
        {!selected.is_entry_point && (
          <div className="rounded-md border border-[#27272a] bg-[#18181b] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
              <ArrowLeftRight size={10} />
              Can hand off to and receive from any participant
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Export with provider ─────────────────────────────────────────

export default function AgentBuilder({
  projects,
  preselectedProject,
  userId,
  agentId,
  initialAgent,
  initialParticipants,
}: {
  projects: Project[];
  preselectedProject: string;
  userId: string;
  agentId?: string;
  initialAgent?: Agent | null;
  initialParticipants?: Participant[] | null;
}) {
  return (
    <div className="-mx-10 -my-8 h-screen min-h-0">
      <ReactFlowProvider>
        <AgentBuilderInner
          projects={projects}
          preselectedProject={preselectedProject}
          userId={userId}
          agentId={agentId}
          initialAgent={initialAgent}
          initialParticipants={initialParticipants}
        />
      </ReactFlowProvider>
    </div>
  );
}
