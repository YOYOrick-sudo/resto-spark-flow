import { FieldHelp } from "@/components/polar/FieldHelp";

interface SectionHeaderProps {
  label: string;
  children?: React.ReactNode;
}

export function SectionHeader({ label, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-label text-foreground">{label}</span>
      {children}
    </div>
  );
}
