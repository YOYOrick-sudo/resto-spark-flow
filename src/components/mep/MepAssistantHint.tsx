interface MepAssistantHintProps {
  hint: string;
}

export function MepAssistantHint({ hint }: MepAssistantHintProps) {
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      ℹ️ {hint}
    </p>
  );
}
