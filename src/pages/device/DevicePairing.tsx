import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NestoButton, NestoCard, NestoInput } from "@/components/polar";
import { Smartphone, Loader2 } from "lucide-react";

export default function DevicePairing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePair() {
    if (code.length !== 6) {
      setError("Voer een 6-cijferige code in");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "pair-device",
        {
          body: {
            pairing_code: code,
            device_name: deviceName || undefined,
          },
        }
      );
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);
      if (!data?.email || !data?.password) {
        throw new Error("Ongeldig antwoord van pairing-server");
      }

      // Sign in met returned device-credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInErr) throw signInErr;

      // Bewaar voor auto-reconnect na app-restart
      localStorage.setItem("nesto_device_email", data.email);
      localStorage.setItem("nesto_device_password", data.password);
      if (data.device_id) {
        localStorage.setItem("nesto_device_id", data.device_id);
      }

      navigate("/", { replace: true });
    } catch (e: any) {
      console.error("[device-pair] failed:", e);
      setError(e.message ?? "Koppeling mislukt");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <NestoCard className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Apparaat koppelen</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Voer de 6-cijferige pairing-code in die in de admin-omgeving is
            gegenereerd.
          </p>
        </div>

        <div className="space-y-4">
          <NestoInput
            label="Pairing-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            className="text-center text-3xl tracking-[0.5em] font-mono"
            maxLength={6}
            autoFocus
          />
          <NestoInput
            label="Apparaatnaam (optioneel)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Bijv. iPad Keuken 1"
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <NestoButton
            onClick={handlePair}
            disabled={code.length !== 6 || isLoading}
            className="w-full min-h-[44px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Koppel apparaat"
            )}
          </NestoButton>
        </div>
      </NestoCard>
    </div>
  );
}
