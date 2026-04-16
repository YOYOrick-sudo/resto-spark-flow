import { NestoCard } from "@/components/polar/NestoCard";
import { CheckCircle2, Shield, Activity } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Welkom in het Nesto platformbeheer
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NestoCard className="bg-slate-900 border-slate-800">
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Status</p>
              <p className="text-lg font-semibold text-white mt-0.5">Admin Panel actief</p>
            </div>
          </div>
        </NestoCard>

        <NestoCard className="bg-slate-900 border-slate-800">
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Beveiliging</p>
              <p className="text-lg font-semibold text-white mt-0.5">2FA vereist</p>
            </div>
          </div>
        </NestoCard>

        <NestoCard className="bg-slate-900 border-slate-800">
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sprint</p>
              <p className="text-lg font-semibold text-white mt-0.5">A.1 Ronde 1</p>
            </div>
          </div>
        </NestoCard>
      </div>

      {/* Placeholder content */}
      <NestoCard className="bg-slate-900 border-slate-800">
        <div className="p-6">
          <h2 className="text-base font-semibold text-white mb-3">Volgende stappen</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Admin authenticatie + 2FA
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-600">○</span> Klantenbeheer (Ronde 2)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-600">○</span> Revenue dashboard (Ronde 3)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-600">○</span> AI-verbruik overzicht (Ronde 3)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-600">○</span> Feature flags (Ronde 4)
            </li>
          </ul>
        </div>
      </NestoCard>
    </div>
  );
}
