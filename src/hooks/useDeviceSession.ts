import { useAuth } from "@/contexts/AuthContext";

export interface DeviceSessionInfo {
  isDevice: boolean;
  deviceId: string | null;
  deviceRole: string | null;
  locationId: string | null;
}

/**
 * Detecteert of huidige sessie een device-sessie is.
 * Werkt op basis van app_metadata (gezet door pair-device edge function bij user-create).
 * Wanneer Custom Access Token Hook actief is, kan dit later naar JWT-claims migreren.
 */
export function useDeviceSession(): DeviceSessionInfo {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const appMeta = (user?.app_metadata ?? {}) as Record<string, any>;

  const isDevice = !!(meta.is_device || appMeta.is_device);

  return {
    isDevice,
    deviceId: meta.device_id ?? appMeta.device_id ?? null,
    deviceRole: appMeta.device_role ?? meta.device_role ?? null,
    locationId: meta.location_id ?? appMeta.location_id ?? null,
  };
}
