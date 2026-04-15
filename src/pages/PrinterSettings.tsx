import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NestoButton, NestoInput, Spinner } from "@/components/polar";
import { Switch } from "@/components/ui/switch";
import { PrinterStatus } from "@/components/labels/PrinterStatus";
import { LabelPreview } from "@/components/labels/LabelPreview";
import { usePrinterConfig, useUpsertPrinterConfig } from "@/hooks/usePrinterConfig";
import { useLabelTemplates, useUpdateLabelTemplate, type LabelVeld } from "@/hooks/useLabelTemplates";
import { generateTestZPL, generateZPL, type PrintConfig } from "@/utils/zplGenerator";
import { printLabel } from "@/services/printService";
import { nestoToast } from "@/lib/nestoToast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Printer, GripVertical } from "lucide-react";

const SPEED_OPTIONS = [
  { value: "2", label: "2 ips" },
  { value: "3", label: "3 ips" },
  { value: "4", label: "4 ips (standaard)" },
  { value: "5", label: "5 ips" },
  { value: "6", label: "6 ips" },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function PrinterSettings() {
  const { data: config, isLoading: configLoading } = usePrinterConfig();
  const upsertConfig = useUpsertPrinterConfig();
  const { data: templates = [], isLoading: templatesLoading } = useLabelTemplates();
  const updateTemplate = useUpdateLabelTemplate();

  // Printer form state
  const [naam, setNaam] = useState("Keuken printer");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [breedte, setBreedte] = useState("60");
  const [hoogte, setHoogte] = useState("40");
  const [darkness, setDarkness] = useState("15");
  const [speed, setSpeed] = useState("4");

  useEffect(() => {
    if (config) {
      setNaam(config.naam);
      setBridgeUrl(config.print_bridge_url ?? "");
      setPrinterIp(config.printer_ip ?? "");
      setPrinterPort(String(config.printer_port ?? 9100));
      setBreedte(String(config.label_breedte_mm ?? 60));
      setHoogte(String(config.label_hoogte_mm ?? 40));
      setDarkness(String(config.print_darkness ?? 15));
      setSpeed(String(config.print_speed ?? 4));
    }
  }, [config]);

  const handleSaveConfig = () => {
    upsertConfig.mutate({
      id: config?.id,
      naam,
      print_bridge_url: bridgeUrl || null,
      printer_ip: printerIp || null,
      printer_port: parseInt(printerPort) || 9100,
      label_breedte_mm: parseInt(breedte) || 60,
      label_hoogte_mm: parseInt(hoogte) || 40,
      print_darkness: parseInt(darkness) || 15,
      print_speed: parseInt(speed) || 4,
    });
  };

  const handleTestPrint = async () => {
    if (!config) { nestoToast.error("Sla eerst de configuratie op"); return; }
    const testConfig: PrintConfig = {
      label_breedte_mm: parseInt(breedte) || 60,
      label_hoogte_mm: parseInt(hoogte) || 40,
      darkness: parseInt(darkness) || 15,
      speed: parseInt(speed) || 4,
    };
    const zpl = generateTestZPL(testConfig);
    const result = await printLabel(zpl, config);
    if (result.success) {
      nestoToast.success("Testprint verstuurd");
    } else {
      nestoToast.error("Testprint mislukt", result.error);
    }
  };

  // Template preview
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const previewZpl = useMemo(() => {
    if (!selectedTemplate) return "";
    const cfg: PrintConfig = {
      label_breedte_mm: parseInt(breedte) || 60,
      label_hoogte_mm: parseInt(hoogte) || 40,
      darkness: parseInt(darkness) || 15,
      speed: parseInt(speed) || 4,
    };
    return generateZPL(
      { productnaam: "Tomatenrelish", batch_nummer: "B-2026-042", productie_datum: "15-04-2026", houdbaar_tot: "17-04-2026", medewerker: "Arie", allergenen: ["gluten", "melk"] },
      cfg,
      selectedTemplate.velden as LabelVeld[]
    );
  }, [selectedTemplate, breedte, hoogte, darkness, speed]);

  const handleToggleVeld = (templateId: string, veldIndex: number) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const newVelden = tpl.velden.map((v, i) => i === veldIndex ? { ...v, actief: !v.actief } : v);
    updateTemplate.mutate({ id: templateId, velden: newVelden });
  };

  const handleSetDefault = (templateId: string) => {
    // Unset all others, set this one
    for (const t of templates) {
      if (t.id === templateId) {
        updateTemplate.mutate({ id: t.id, is_default: true });
      } else if (t.is_default) {
        updateTemplate.mutate({ id: t.id, is_default: false });
      }
    }
  };

  const isLoading = configLoading || templatesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/voorkeuren">Instellingen</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/keuken">Keuken</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Printer & Labels</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb><BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/voorkeuren">Instellingen</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/keuken">Keuken</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Printer & Labels</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList></Breadcrumb>

      <div className="max-w-[720px] mx-auto">
        <div className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 text-foreground">Printer & Labels</h1>
              <p className="text-body text-muted-foreground mt-1">Configureer je Zebra labelprinter en label templates.</p>
            </div>
            <PrinterStatus config={config ?? null} />
          </div>
        </div>

        {/* Section 1: Printer verbinding */}
        <div>
          <SectionHeader title="PRINTER VERBINDING" description="Verbind je Raspberry Pi print bridge met de Zebra printer." />
          <div className="space-y-4">
            <NestoInput label="Printer naam" value={naam} onChange={(e) => setNaam(e.target.value)} />
            <NestoInput
              label="Print bridge URL"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              placeholder="http://192.168.1.50:3001"
            />
            <p className="text-xs text-muted-foreground -mt-2">Het IP-adres van je Raspberry Pi, bijv. http://192.168.1.50:3001</p>
            <div className="grid grid-cols-2 gap-4">
              <NestoInput label="Printer IP" value={printerIp} onChange={(e) => setPrinterIp(e.target.value)} placeholder="192.168.1.100" />
              <NestoInput label="Printer poort" type="number" value={printerPort} onChange={(e) => setPrinterPort(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Section 2: Label afmetingen */}
        <div className="border-t border-border/50 pt-6 mt-6">
          <SectionHeader title="LABEL AFMETINGEN" description="Stel de afmetingen en kwaliteit van je labels in." />
          <div className="grid grid-cols-2 gap-4">
            <NestoInput label="Breedte (mm)" type="number" value={breedte} onChange={(e) => setBreedte(e.target.value)} />
            <NestoInput label="Hoogte (mm)" type="number" value={hoogte} onChange={(e) => setHoogte(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Darkness (0-30)</label>
              <input
                type="range"
                min={0}
                max={30}
                value={darkness}
                onChange={(e) => setDarkness(e.target.value)}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground text-right">{darkness}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Print snelheid</label>
              <Select value={speed} onValueChange={setSpeed}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save + Test */}
        <div className="border-t border-border/50 pt-6 mt-6 flex gap-3">
          <NestoButton onClick={handleSaveConfig} isLoading={upsertConfig.isPending}>Opslaan</NestoButton>
          <NestoButton variant="outline" onClick={handleTestPrint} disabled={!config}>
            <Printer className="h-4 w-4 mr-1.5" />Testprint
          </NestoButton>
        </div>

        {/* Section 3: Label templates */}
        <div className="border-t border-border/50 pt-6 mt-6">
          <SectionHeader title="LABEL TEMPLATES" description="Beheer welke velden op je labels verschijnen." />

          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen templates gevonden.</p>
          ) : (
            <div className="space-y-4">
              {/* Template tabs */}
              <div className="flex gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedTemplateId === t.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {t.naam} {t.is_default ? "★" : ""}
                  </button>
                ))}
              </div>

              {selectedTemplate && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Fields toggles */}
                  <div className="space-y-2">
                    {selectedTemplate.velden.map((v, i) => (
                      <div key={v.veld} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                          <span className="text-sm">{v.label}</span>
                          <span className="text-[11px] text-muted-foreground">({v.veld})</span>
                        </div>
                        <Switch
                          checked={v.actief}
                          onCheckedChange={() => handleToggleVeld(selectedTemplate.id, i)}
                        />
                      </div>
                    ))}
                    {!selectedTemplate.is_default && (
                      <NestoButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(selectedTemplate.id)}
                        className="mt-2"
                      >
                        Maak standaard
                      </NestoButton>
                    )}
                  </div>

                  {/* Live preview */}
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Preview</label>
                    <LabelPreview
                      zpl={previewZpl}
                      widthMm={parseInt(breedte) || 60}
                      heightMm={parseInt(hoogte) || 40}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
