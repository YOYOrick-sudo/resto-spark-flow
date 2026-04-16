import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Sparkles,
  Flag,
  ScrollText,
  Settings,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { path: "/nesto-admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/nesto-admin/klanten", label: "Klanten", icon: Building2 },
  { path: "/nesto-admin/gebruikers", label: "Gebruikers", icon: Users },
  { path: "/nesto-admin/revenue", label: "Revenue", icon: DollarSign },
  { path: "/nesto-admin/ai-verbruik", label: "AI-verbruik", icon: Sparkles },
  { path: "/nesto-admin/feature-flags", label: "Feature Flags", icon: Flag },
  { path: "/nesto-admin/audit-log", label: "Audit Log", icon: ScrollText },
  { path: "/nesto-admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-slate-800 bg-slate-900">
        {/* Header */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">NESTO ADMIN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {adminMenuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )
                  }
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Terug naar app</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut size={16} />
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 text-white">
        <Outlet />
      </main>
    </div>
  );
}
