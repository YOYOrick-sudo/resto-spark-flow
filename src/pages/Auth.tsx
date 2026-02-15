
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NestoButton, NestoInput, NestoCard, NestoTabs, NestoLogo } from '@/components/polar';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Ongeldig e-mailadres');
const passwordSchema = z.string().min(6, 'Wachtwoord moet minimaal 6 karakters zijn');

export default function AuthPage() {
  const { isAuthenticated, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateForm = (): boolean => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error: authError } = await signIn(email, password);
    setIsSubmitting(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.');
      } else {
        setError(authError.message);
      }
      return;
    }

    navigate('/');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error: authError } = await signUp(email, password, name);
    setIsSubmitting(false);

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Dit e-mailadres is al geregistreerd. Probeer in te loggen.');
      } else {
        setError(authError.message);
      }
      return;
    }

    setSuccessMessage('Account aangemaakt! Je wordt automatisch ingelogd...');
    
    // Auto-login after signup (since auto-confirm is enabled)
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  const tabs = [
    { id: 'login', label: 'Inloggen' },
    { id: 'signup', label: 'Registreren' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <NestoLogo size="lg" className="justify-center" />
          <p className="text-muted-foreground mt-2">
            Horeca management platform
          </p>
        </div>

        <NestoCard className="p-6">
          <NestoTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-primary">{successMessage}</p>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <NestoInput
                type="email"
                label="E-mailadres"
                placeholder="jouw@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <NestoInput
                type="password"
                label="Wachtwoord"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <NestoButton
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Bezig...' : 'Inloggen'}
              </NestoButton>
            </form>
          )}

          {/* Signup Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <NestoInput
                type="text"
                label="Naam"
                placeholder="Je naam"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <NestoInput
                type="email"
                label="E-mailadres"
                placeholder="jouw@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <NestoInput
                type="password"
                label="Wachtwoord"
                placeholder="Minimaal 6 karakters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <NestoButton
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Bezig...' : 'Account aanmaken'}
              </NestoButton>
            </form>
          )}
        </NestoCard>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Door in te loggen ga je akkoord met onze voorwaarden.
        </p>
      </div>
    </div>
  );
}
