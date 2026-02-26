import Sidebar from "@/components/sidebar";
import { UserSyncProvider } from "@/lib/user-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserSyncProvider>
      <div className="flex h-screen overflow-hidden bg-[#09090b]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-10 py-8">{children}</main>
      </div>
    </UserSyncProvider>
  );
}
