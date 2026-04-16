import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";
import { nestoToast } from "@/lib/nestoToast";

type Mode = "enroll" | "verify";

export function MFAEnrollmentPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("enroll");
  const [qrCode, setQrCode] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initMFA();
  }, []);

  async function initMFA() {
    setIsLoading(true);
    setError(null);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();

      // Check voor bestaande verified factor
      const verifiedFactor = factors?.totp?.find(
        (f) => f.factor_type === "totp" && f.status === "verified"
      );

      if (verifiedFactor) {
        // Al ingesteld → alleen sessie verifiëren (geen nieuwe QR)
        setMode("verify");
        setFactorId(verifiedFactor.id);
        return;
      }

      // Cleanup: verwijder oude unverified factors
      if (factors?.totp) {
        for (const factor of factors.totp) {
          if ((factor as any).status === "unverified") {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      }

      // Enroll nieuwe TOTP factor
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Nesto Admin TOTP",
      });

      if (enrollError) throw enrollError;

      setMode("enroll");
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    } catch (err: any) {
      console.error("[MFA] init error:", err);
      setError(err.message || "Kon 2FA niet initialiseren");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify() {
    if (verifyCode.length !== 6) {
      setError("Voer een 6-cijferige code in");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      nestoToast.success(mode === "enroll" ? "2FA succesvol ingesteld!" : "Sessie geverifieerd");
      // Sessie is nu AAL2 → AuthContext vuurt MFA_CHALLENGE_VERIFIED
      // → useAdminAuth re-runt via access_token dependency → guard laat door
      navigate("/nesto-admin", { replace: true });
    } catch (err: any) {
      console.error("[MFA] verify error:", err);
      setError(err.message || "Verificatie mislukt. Probeer opnieuw.");
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  }

  const isEnrollMode = mode === "enroll";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <NestoCard className="bg-slate-900 border-slate-800">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {isEnrollMode ? "2FA instellen" : "2FA verifiëren"}
                </h1>
                <p className="text-sm text-slate-400">
                  {isEnrollMode ? "Verplicht voor admin-toegang" : "Bevestig je identiteit"}
                </p>
              </div>
            </div>

            {/* Context */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-400 leading-relaxed">
                {isEnrollMode ? (
                  <>
                    <strong className="text-slate-300">Waarom 2FA?</strong> Het admin-paneel bevat
                    gevoelige klantgegevens en platforminstellingen. Twee-factor authenticatie
                    voorkomt ongeautoriseerde toegang, zelfs als je wachtwoord gelekt is.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-300">Sessie verifiëren.</strong> Je hebt 2FA al
                    ingesteld. Open je authenticator-app en voer de huidige 6-cijferige code in om
                    deze sessie te activeren voor admin-toegang.
                  </>
                )}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* QR Code — alleen bij enroll */}
                {isEnrollMode && qrCode && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Scan deze QR-code met je authenticator-app (Google Authenticator, Authy,
                      1Password):
                    </p>
                    <div className="flex justify-center bg-white rounded-lg p-4">
                      <img src={qrCode} alt="QR Code voor 2FA" className="w-48 h-48" />
                    </div>
                  </div>
                )}

                {/* Code invoer */}
                {factorId && (
                  <div className="space-y-3">
                    <label className="text-sm text-slate-300">
                      {isEnrollMode
                        ? "Voer de 6-cijferige code in:"
                        : "Voer je 2FA-code in:"}
                    </label>
                    <NestoInput
                      value={verifyCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setVerifyCode(val);
                      }}
                      placeholder="000000"
                      className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-800 border-slate-700 text-white"
                      maxLength={6}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && verifyCode.length === 6) handleVerify();
                      }}
                    />
                    <NestoButton
                      onClick={handleVerify}
                      disabled={verifyCode.length !== 6 || isVerifying}
                      className="w-full"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {isEnrollMode ? "Verifieer & activeer" : "Verifieer sessie"}
                        </>
                      )}
                    </NestoButton>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                {error}
              </p>
            )}
          </div>
        </NestoCard>
      </div>
    </div>
  );
}
