// Sprint A.3: Yield-correctie panel (NestoPanel, 460px)
// Twee modi: "Vanaf nu" (manual_override) of "Eerdere datum" (correction)
import * as React from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton, NestoInput, NestoDatePicker } from "@/components/polar";
import { YieldSourcePill, getYieldSourceLabel } from "./YieldSourcePill";
import { useApplyYieldCorrection, type CurrentYield } from "@/hooks/useYield";
import { Info } from "lucide-react";

interface YieldCorrectionPanelProps {
  open: boolean;
  onClose: () => void;
  methodeId: string;
  methodeLabel: string;
  current: CurrentYield | null;
}

const MIN_REASON_LENGTH = 5;

export function YieldCorrectionPanel({
  open,
  onClose,
  methodeId,
  methodeLabel,
  current,
}: YieldCorrectionPanelProps) {
  const apply = useApplyYieldCorrection();

  // UI in %, server-side decimal (0..2)
  const initialPct = current ? Math.round(current.yield_pct * 100) : 100;
  const [pct, setPct] = React.useState<number>(initialPct);
  const [mode, setMode] = React.useState<"now" | "past">("now");
  const [pastDate, setPastDate] = React.useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [reason, setReason] = React.useState("");

  // Reset state wanneer panel (her)opent
  React.useEffect(() => {
    if (open) {
      setPct(current ? Math.round(current.yield_pct * 100) : 100);
      setMode("now");
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setPastDate(d);
      setReason("");
    }
  }, [open, current]);

  // Validatie
  const pctValid = pct >= 1 && pct <= 200;
  const reasonRequired = mode === "past";
  const reasonValid = !reasonRequired || reason.trim().length >= MIN_REASON_LENGTH;
  const dateValid = mode === "now" || (!!pastDate && pastDate <= new Date());
  const canSubmit = pctValid && reasonValid && dateValid && !apply.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const effectiveFrom =
      mode === "past" && pastDate ? pastDate.toISOString() : null;
    apply.mutate(
      {
        methodeId,
        newYieldPct: pct / 100,
        effectiveFrom,
        correctionReason: reason.trim() ? reason.trim() : null,
      },
      { onSuccess: () => onClose() }
    );
  };

  const today = React.useMemo(() => new Date(), []);

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title="Yield aanpassen"
      footer={
        <div className="flex items-center justify-end gap-2">
          <NestoButton variant="ghost" onClick={onClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            isLoading={apply.isPending}
            disabled={!canSubmit}
          >
            Opslaan
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="px-5 pt-5 pb-6 space-y-6">
          <div>
            <h2
              ref={titleRef}
              className="text-[18px] font-semibold tracking-tight text-foreground"
            >
              Yield aanpassen
            </h2>
            <p className="text-[12px] text-muted-foreground mt-1 truncate">
              {methodeLabel}
            </p>
          </div>

          {/* Huidige waarde */}
          <div className="rounded-xl bg-muted/40 border border-border/40 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Huidige yield
            </div>
            {current ? (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[20px] font-semibold tabular-nums text-foreground">
                  {Math.round(current.yield_pct * 100)}%
                </span>
                <YieldSourcePill source={current.source} />
              </div>
            ) : (
              <div className="mt-1.5 text-sm text-muted-foreground">
                Geen yield-waarde gevonden
              </div>
            )}
          </div>

          {/* Nieuwe waarde */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Nieuwe yield
            </label>
            <div className="flex items-center gap-2">
              <NestoInput
                type="number"
                min={1}
                max={200}
                step={1}
                value={pct}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return;
                  setPct(Number(v));
                }}
                className="w-24 tabular-nums"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {!pctValid && (
              <p className="text-[11px] text-destructive">
                Yield moet tussen 1% en 200% liggen.
              </p>
            )}
          </div>

          {/* Mode-keuze */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-foreground">
              Geldig vanaf
            </label>

            <ModeOption
              checked={mode === "now"}
              onSelect={() => setMode("now")}
              title="Vanaf nu"
              subtitle={
                <>
                  Wordt opgeslagen als{" "}
                  <span className="text-primary font-medium">
                    {getYieldSourceLabel("manual_override")}
                  </span>
                  .
                </>
              }
            />

            <ModeOption
              checked={mode === "past"}
              onSelect={() => setMode("past")}
              title="Eerdere datum"
              subtitle={
                <>
                  Wordt opgeslagen als{" "}
                  <span className="text-warning font-medium">
                    {getYieldSourceLabel("correction")}
                  </span>
                  . Historie blijft zichtbaar.
                </>
              }
            >
              {mode === "past" && (
                <div className="mt-2.5">
                  <NestoDatePicker
                    value={pastDate}
                    onChange={setPastDate}
                    maxDate={today}
                    placeholder="Kies datum…"
                  />
                </div>
              )}
            </ModeOption>
          </div>

          {/* Reden */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
              Reden{" "}
              {reasonRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (optioneel)
                </span>
              )}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                reasonRequired
                  ? "Bijv: 'Yield was destijds verkeerd ingeschat, werkelijke meting via MEP-data toont 70%'"
                  : "Korte toelichting (optioneel)"
              }
              className="w-full min-h-[80px] rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none resize-y"
            />
            {reasonRequired && (
              <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Verplicht bij correctie van eerdere datum — voor audit-trail
                (min. {MIN_REASON_LENGTH} karakters).
              </p>
            )}
          </div>
        </div>
      )}
    </NestoPanel>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  subtitle,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "w-full text-left rounded-xl border px-3.5 py-3 transition-colors " +
        (checked
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/80 bg-card")
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          className={
            "mt-1 h-3.5 w-3.5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 " +
            (checked ? "border-primary" : "border-border")
          }
        >
          {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground">{title}</div>
          <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">
            {subtitle}
          </div>
          {children}
        </div>
      </div>
    </button>
  );
}
