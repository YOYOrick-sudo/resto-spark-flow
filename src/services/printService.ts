import type { PrinterConfiguratie } from "@/hooks/usePrinterConfig";

export async function printLabel(
  zpl: string,
  printerConfig: PrinterConfiguratie
): Promise<{ success: boolean; error?: string }> {
  if (!printerConfig.print_bridge_url) {
    return { success: false, error: "Geen print bridge geconfigureerd. Ga naar Instellingen → Keuken → Printer." };
  }

  try {
    const response = await fetch(`${printerConfig.print_bridge_url}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zpl,
        printer_ip: printerConfig.printer_ip,
        printer_port: printerConfig.printer_port,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Printer niet bereikbaar. Controleer of de print bridge aan staat." };
  }
}

export async function getPrinterStatus(
  printerConfig: PrinterConfiguratie
): Promise<"online" | "offline" | "unknown"> {
  if (!printerConfig.print_bridge_url) return "unknown";
  try {
    const response = await fetch(`${printerConfig.print_bridge_url}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}
