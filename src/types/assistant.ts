export type AssistantSeverity = "info" | "warning" | "error" | "ok";
export type AssistantModule = "reserveringen" | "keuken" | "revenue" | "configuratie";
export type AssistantKind = "signal" | "insight";

export interface AssistantItem {
  id: string;
  kind: AssistantKind;
  module: AssistantModule;
  severity: AssistantSeverity;
  title: string;
  message?: string;
  created_at: string; // ISO string
  action_path?: string;
  source_ids?: string[]; // alleen voor kind="insight"
  actionable?: boolean;
  priority?: number; // laagste = hoogste prioriteit
}
