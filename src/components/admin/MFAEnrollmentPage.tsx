import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";
import { nestoToast } from "@/lib/nestoToast";

export function MFAEnrollmentPage() {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    enrollMFA();
  }, []);

  async function enrollMFA() {
    setIsEnrolling(true);
    setError(null);

    try {
      // Cleanup: remove any existing unverified TOTP factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const factor of factors.totp) {
          if (factor.status === "unverified") {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      }

      // Check if already has verified factor
      if (factors?.totp?.some((f) => f.status === "verified")) {
        // Already enrolled, just need to verify session
        nestoToast.success("2FA is al ingesteld. Verifieer je sessie.");
        navigate("/nesto-admin");
        return;
      }

      // Enroll new TOTP factor
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Nesto Admin TOTP",
      });

      if (enrollError) throw enrollError;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    } catch (err: any) {
      console.error("[MFA] enroll error:", err);
      setError(err.message || "Kon 2FA niet instellen");
    } finally {
      setIsEnrolling(false);
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

      nestoToast.success("2FA succesvol ingesteld!");
      navigate("/nesto-admin");
    } catch (err: any) {
      console.error("[MFA] verify error:", err);
      setError(err.message || "Verificatie mislukt. Probeer opnieuw.");
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  }

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
                <h1 className="text-lg font-semibold text-white">2FA instellen</h1>
                <p className="text-sm text-slate-400">Verplicht voor admin-toegang</p>
              </div>
            </div>

            {/* Why 2FA */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Waarom 2FA?</strong> Het admin-paneel bevat 
                gevoelige klantgegevens en platforminstellingen. Twee-factor authenticatie 
                voorkomt ongeautoriseerde toegang, zelfs als je wachtwoord gelekt is.
              </p>
            </div>

            {isEnrolling ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : qrCode ? (
              <>
                {/* QR Code */}
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">
                    Scan deze QR-code met je authenticator-app (Google Authenticator, Authy, 1Password):
                  </p>
                  <div className="flex justify-center bg-white rounded-lg p-4">
                    <img src={qrCode} alt="QR Code voor 2FA" className="w-48 h-48" />
                  </div>
                </div>

                {/* Verify */}
                <div className="space-y-3">
                  <label className="text-sm text-slate-300">
                    Voer de 6-cijferige code in:
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
                        Verifieer & activeer
                      </>
                    )}
                  </NestoButton>
                </div>
              </>
            ) : null}

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
