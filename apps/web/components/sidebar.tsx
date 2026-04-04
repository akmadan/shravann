"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { useBackendUser } from "@/lib/user-sync";

const nav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Forms", href: "/forms", icon: FileText },
  { label: "Sessions", href: "/sessions", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { backendUser, logout } = useBackendUser();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#09090b]">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
          S
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Shravann
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-[#71717a] hover:bg-white/[0.04] hover:text-[#a1a1aa]"
              }`}
            >
              <item.icon size={16} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-xs font-medium text-[#a1a1aa]">
              {(backendUser?.name ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">
                {backendUser?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] text-[#52525b]">
                {backendUser?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-md p-1.5 text-[#52525b] transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
