import { useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import {
  NestoButton,
  NestoBadge,
  NestoCard,
  NestoPanel,
  NestoInput,
  NestoSelect,
  Spinner,
  EmptyState,
} from "@/components/polar";
import { useDevices } from "@/hooks/useDevices";
import { useDeviceMutations, type DeviceRole } from "@/hooks/useDeviceMutations";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";
import { Smartphone, Plus, RefreshCw, Power, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const ROLE_LABELS: Record<DeviceRole, string> = {
  kitchen_station: "Keuken",
  service_station: "Bediening",
  bar_station: "Bar",
  reception_station: "Receptie / Host",
};

const STATUS_BADGES: Record<
  string,
  { variant: "default" | "warning" | "success" | "error"; label: string }
> = {
  pending_activation: { variant: "warning", label: "Wacht op pairing" },
  active: { variant: "success", label: "Actief" },
  inactive: { variant: "default", label: "Inactief" },
};

export default function SettingsApparaten() {
  const { data: devices, isLoading } = useDevices();
  const { createDevice, regenerateCode, deactivateDevice } = useDeviceMutations();
  const { currentLocation } = useUserContext();
  const [addOpen, setAddOpen] = useState(false);
  const [showCodeFor, setShowCodeFor] = useState<string | null>(null);

  const [form, setForm] = useState<{
    device_name: string;
    device_role: DeviceRole;
  }>({
    device_name: "",
    device_role: "kitchen_station",
  });

  const handleCreate = async () => {
    if (!currentLocation?.id || !form.device_name) return;
    const result = await createDevice.mutateAsync({
      location_id: currentLocation.id,
      ...form,
    });
    setShowCodeFor(result.id);
    setAddOpen(false);
    setForm({ device_name: "", device_role: "kitchen_station" });
  };

  const codeDevice = devices?.find((d) => d.id === showCodeFor);

  return (
    <SettingsDetailLayout
      title="Apparaten"
      description="Beheer iPads, kiosks en andere gekoppelde apparaten."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Apparaten" },
      ]}
      actions={
        <NestoButton onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Apparaat toevoegen
        </NestoButton>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !devices?.length ? (
        <EmptyState
          icon={Smartphone}
          title="Geen apparaten"
          description="Voeg je eerste apparaat toe om te beginnen."
        />
      ) : (
        <NestoCard className="divide-y divide-border/40">
          {devices.map((d) => {
            const badge = STATUS_BADGES[d.status] ?? STATUS_BADGES.inactive;
            const roleLabel = ROLE_LABELS[d.device_role as DeviceRole] ?? d.device_role;
            return (
              <div
                key={d.id}
                className="flex items-center gap-4 px-4 py-3 min-h-[64px]"
              >
                <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{d.device_name}</p>
                    <NestoBadge variant={badge.variant} size="sm">
                      {badge.label}
                    </NestoBadge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {roleLabel} · {d.location_naam}
                    {d.last_heartbeat && (
                      <>
                        {" "}
                        · laatst actief{" "}
                        {formatDistanceToNow(new Date(d.last_heartbeat), {
                          locale: nl,
                          addSuffix: true,
                        })}
                      </>
                    )}
                  </p>
                </div>
                {d.status === "pending_activation" && (
                  <NestoButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCodeFor(d.id)}
                  >
                    Toon code
                  </NestoButton>
                )}
                {d.status === "active" && (
                  <NestoButton
                    variant="ghost"
                    size="sm"
                    onClick={() => regenerateCode.mutate(d.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Opnieuw koppelen
                  </NestoButton>
                )}
                {d.status !== "inactive" && (
                  <NestoButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Apparaat "${d.device_name}" deactiveren?`)) {
                        deactivateDevice.mutate(d.id);
                      }
                    }}
                  >
                    <Power className="h-3.5 w-3.5 text-destructive" />
                  </NestoButton>
                )}
              </div>
            );
          })}
        </NestoCard>
      )}

      {/* Add panel */}
      <NestoPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nieuw apparaat"
      >
        {(titleRef) => (
          <div className="px-5 py-6 space-y-4">
            <h2 ref={titleRef} className="text-xl font-semibold">
              Nieuw apparaat
            </h2>
            <NestoInput
              label="Naam"
              value={form.device_name}
              onChange={(e) =>
                setForm({ ...form, device_name: e.target.value })
              }
              placeholder="Bijv. iPad Keuken 1"
            />
            <NestoSelect
              label="Rol"
              value={form.device_role}
              onValueChange={(v: any) =>
                setForm({ ...form, device_role: v as DeviceRole })
              }
              options={(Object.entries(ROLE_LABELS) as Array<[DeviceRole, string]>).map(
                ([value, label]) => ({ value, label })
              )}
            />
            <NestoButton
              onClick={handleCreate}
              disabled={!form.device_name}
              isLoading={createDevice.isPending}
              className="w-full"
            >
              Aanmaken & code genereren
            </NestoButton>
          </div>
        )}
      </NestoPanel>

      {/* Code display panel */}
      <NestoPanel
        open={!!showCodeFor && !!codeDevice}
        onClose={() => setShowCodeFor(null)}
        title="Pairing-code"
      >
        {(titleRef) =>
          codeDevice ? (
            <div className="px-5 py-6 space-y-5">
              <h2 ref={titleRef} className="text-xl font-semibold">
                Pairing-code
              </h2>
              <p className="text-sm text-muted-foreground">
                Open de Nesto-app op{" "}
                <strong>{codeDevice.device_name}</strong>, ga naar{" "}
                <code>/device/pair</code> en voer onderstaande code in.
              </p>
              <div className="bg-muted/30 rounded-2xl p-8 text-center">
                <p className="text-5xl font-mono font-bold tracking-[0.4em]">
                  {codeDevice.pairing_code ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {codeDevice.pairing_expires_at && (
                    <>
                      Verloopt{" "}
                      {formatDistanceToNow(
                        new Date(codeDevice.pairing_expires_at),
                        { locale: nl, addSuffix: true }
                      )}
                    </>
                  )}
                </p>
              </div>
              <NestoButton
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (codeDevice.pairing_code) {
                    navigator.clipboard.writeText(codeDevice.pairing_code);
                    nestoToast.success("Code gekopieerd");
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Kopieer code
              </NestoButton>
              <p className="text-xs text-muted-foreground text-center">
                Status verandert automatisch zodra het apparaat koppelt.
              </p>
            </div>
          ) : null
        }
      </NestoPanel>
    </SettingsDetailLayout>
  );
}
