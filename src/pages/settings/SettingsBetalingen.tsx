import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMollieConnection } from '@/hooks/useMollieConnection';
import { CreditCard, ExternalLink, Unplug, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsBetalingen() {
  const { connection, isLoading, isConnected, onboardingStatus, disconnect, isDisconnecting, getAuthorizeUrl, refetch } = useMollieConnection();
  const [searchParams] = useSearchParams();
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Mollie is succesvol verbonden!');
      refetch();
    }
    if (searchParams.get('error')) {
      toast.error(`Mollie verbinding mislukt: ${searchParams.get('error')}`);
    }
  }, [searchParams, refetch]);

  const handleConnect = () => {
    const url = getAuthorizeUrl();
    if (url) window.location.href = url;
  };

  const handleDisconnect = () => {
    disconnect();
    setShowConfirmDisconnect(false);
    toast.success('Mollie verbinding verwijderd');
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Betalingen</h1>
        <p className="text-sm text-muted-foreground mt-1">Verbind Mollie om deposits en betalingen te ontvangen via iDEAL.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Mollie Connect</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ontvang betalingen via iDEAL, creditcard en meer. Veilig en automatisch.
            </p>
          </div>
        </div>

        {!isConnected ? (
          <div className="pt-2">
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Verbind met Mollie
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Je wordt doorgestuurd naar Mollie om toestemming te geven.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {/* Status */}
            <div className="flex items-center gap-2">
              {onboardingStatus === 'completed' || onboardingStatus === 'verified' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : onboardingStatus === 'pending' ? (
                <Clock className="w-4 h-4 text-amber-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {onboardingStatus === 'completed' || onboardingStatus === 'verified'
                  ? 'Actief — Betalingen zijn ingeschakeld'
                  : onboardingStatus === 'pending'
                  ? 'In afwachting — Mollie account wordt geverifieerd'
                  : `Status: ${onboardingStatus}`}
              </span>
            </div>

            {/* Connection info */}
            {connection?.mollie_organization_id && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Organisatie: {connection.mollie_organization_id}</p>
                {connection.mollie_profile_id && <p>Profiel: {connection.mollie_profile_id}</p>}
              </div>
            )}

            {/* Disconnect */}
            {!showConfirmDisconnect ? (
              <button
                onClick={() => setShowConfirmDisconnect(true)}
                className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
              >
                <Unplug className="w-3.5 h-3.5" />
                Ontkoppel Mollie
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Weet je het zeker?</span>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="px-3 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isDisconnecting ? 'Bezig...' : 'Ja, ontkoppel'}
                </button>
                <button
                  onClick={() => setShowConfirmDisconnect(false)}
                  className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
                >
                  Annuleer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Hoe werkt het?</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Gasten betalen een aanbetaling bij het boeken via de widget</li>
          <li>• Het bedrag wordt bepaald door het beleid van het ticket</li>
          <li>• Bij annulering kun je eenvoudig terugbetalen vanuit het reserveringsoverzicht</li>
          <li>• Betalingen worden automatisch bijgehouden bij elke reservering</li>
        </ul>
      </div>
    </div>
  );
}
