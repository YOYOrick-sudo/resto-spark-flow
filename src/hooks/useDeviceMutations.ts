import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";

export type DeviceRole =
  | "kitchen_station"
  | "service_station"
  | "bar_station"
  | "reception_station";

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function useDeviceMutations() {
  const qc = useQueryClient();

  const createDevice = useMutation({
    mutationFn: async (vars: {
      location_id: string;
      device_name: string;
      device_role: DeviceRole;
    }) => {
      const code = generatePairingCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("devices")
        .insert({
          location_id: vars.location_id,
          device_name: vars.device_name,
          device_role: vars.device_role,
          status: "pending_activation",
          pairing_code: code,
          pairing_expires_at: expires,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      nestoToast.success("Apparaat aangemaakt — pairing-code is 15 minuten geldig");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const regenerateCode = useMutation({
    mutationFn: async (deviceId: string) => {
      const code = generatePairingCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("devices")
        .update({
          pairing_code: code,
          pairing_expires_at: expires,
          status: "pending_activation",
        })
        .eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      nestoToast.success("Nieuwe pairing-code gegenereerd");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const deactivateDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("devices")
        .update({
          status: "inactive",
          pairing_code: null,
          pairing_expires_at: null,
        })
        .eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      nestoToast.success("Apparaat gedeactiveerd");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  return { createDevice, regenerateCode, deactivateDevice };
}
