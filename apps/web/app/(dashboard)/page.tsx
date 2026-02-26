"use client";

import { FolderKanban, Bot, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

const quickLinks = [
  {
    label: "Projects",
    description: "Organize agents and team members",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Agents",
    description: "Build and configure AI agents",
    href: "/agents",
    icon: Bot,
  },
  {
    label: "Sessions",
    description: "Monitor conversation history",
    href: "/sessions",
    icon: MessageSquare,
  },
];

export default function DashboardPage() {
  const { backendUser, userLoading, syncError } = usePageReady();

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          {backendUser?.name
            ? `Welcome back, ${backendUser.name.split(" ")[0]}`
            : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Manage your projects, agents, and conversations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
          >
            <div>
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06]">
                <link.icon size={16} className="text-[#a1a1aa]" />
              </div>
              <h3 className="text-sm font-medium text-white">{link.label}</h3>
              <p className="mt-0.5 text-xs text-[#71717a]">
                {link.description}
              </p>
            </div>
            <ArrowRight
              size={14}
              className="mt-1 text-[#3f3f46] transition-colors group-hover:text-[#71717a]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
