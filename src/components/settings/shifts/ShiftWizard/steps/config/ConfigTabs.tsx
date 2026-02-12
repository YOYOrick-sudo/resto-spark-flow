import { cn } from "@/lib/utils";

export type ConfigTabId = "basis" | "capaciteit" | "geavanceerd";

interface ConfigTabsProps {
  activeTab: ConfigTabId;
  onTabChange: (tab: ConfigTabId) => void;
}

const tabs: { id: ConfigTabId; label: string }[] = [
  { id: "basis", label: "Basis" },
  { id: "capaciteit", label: "Capaciteit" },
  { id: "geavanceerd", label: "Geavanceerd" },
];

export function ConfigTabs({ activeTab, onTabChange }: ConfigTabsProps) {
  return (
    <div className="flex gap-4 border-b border-border/60 mb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative pb-2 text-[13px] font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
            activeTab === tab.id
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
