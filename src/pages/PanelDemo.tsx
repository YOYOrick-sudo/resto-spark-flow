import { useState } from 'react';
import { X, Clock, Users, Phone, Mail, CalendarDays, UserCheck, Star, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function PanelShell({ 
  footer,
  children 
}: { 
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl w-[460px] h-[640px]">
      {/* Floating close button */}
      <button className="absolute top-4 right-4 z-10 h-8 w-8 rounded-md flex items-center justify-center hover:bg-secondary transition-colors">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Footer (form mode) */}
      {footer && (
        <div className="px-5 py-4 border-t border-border/50 bg-card">
          {footer}
        </div>
      )}
    </div>
  );
}

function DetailPanelDemo() {
  return (
    <PanelShell>
      <div className="divide-y divide-border/50">
        <div className="p-5 pr-14">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Bevestigd
          </span>

          <h2 className="text-lg font-semibold text-foreground">Jan de Vries</h2>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">4p</span>
            <span>•</span>
            <span>Diner</span>
            <span>•</span>
            <span>Tafel 12</span>
            <span>•</span>
            <span>19:00–21:00</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Star className="h-3 w-3" /> VIP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
              🎂 Verjaardag
            </span>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Gast notitie</p>
            <p className="text-sm text-foreground">Graag een tafel bij het raam, allergie voor noten.</p>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <UserCheck className="h-4 w-4" />
              Inchecken
            </button>
            <button className="px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors">
              Bewerken
            </button>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Klantprofiel</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>+31 6 1234 5678</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>jan@voorbeeld.nl</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">12 bezoeken · laatst 2 weken geleden</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risicoscore</h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-600">12</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Laag risico</p>
              <p className="text-xs text-muted-foreground">Trouwe gast, geen no-shows</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activiteitenlog</h3>
          <div className="space-y-3">
            {[
              { time: '14:32', text: 'Reservering aangemaakt via widget' },
              { time: '14:33', text: 'Bevestigingsmail verzonden' },
              { time: '16:00', text: 'Status → Bevestigd' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xs text-muted-foreground w-10 pt-0.5 shrink-0">{item.time}</span>
                <div className="relative pl-4 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:rounded-full before:bg-border before:ring-2 before:ring-background">
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function FormPanelDemo() {
  const [guests, setGuests] = useState(2);
  
  return (
    <PanelShell
      footer={
        <div className="flex items-center justify-between">
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Annuleren
          </button>
          <button className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Reservering aanmaken
          </button>
        </div>
      }
    >
      <div className="p-5 pr-14 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Nieuwe reservering</h2>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Datum & tijd</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>17 feb 2026</span>
            </div>
            <div className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>19:30</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Aantal gasten</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setGuests(Math.max(1, guests - 1))}
              className="h-10 w-10 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold w-6 text-center">{guests}</span>
            </div>
            <button 
              onClick={() => setGuests(Math.min(20, guests + 1))}
              className="h-10 w-10 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Shift</label>
          <div className="grid grid-cols-2 gap-2">
            {['Lunch', 'Diner'].map((shift) => (
              <button
                key={shift}
                className={cn(
                  "px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                  shift === 'Diner' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-input bg-background text-muted-foreground hover:bg-secondary'
                )}
              >
                {shift}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-5 mt-5">
          <h3 className="text-sm font-medium text-foreground mb-3">Gast gegevens</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Naam</label>
              <input 
                type="text"
                placeholder="Voornaam Achternaam"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefoon</label>
                <input 
                  type="tel"
                  placeholder="+31 6..."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
                <input 
                  type="email"
                  placeholder="gast@..."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Notities</label>
          <textarea
            rows={3}
            placeholder="Bijzonderheden, allergieën..."
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
          />
        </div>
      </div>
    </PanelShell>
  );
}

export default function PanelDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">NestoPanel — Visueel Voorbeeld</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Beide modes 460px breed. Titel scrollt mee, alleen een floating X-knop blijft zichtbaar.
        </p>

        <div className="flex gap-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium border border-blue-500/20">
                mode="detail"
              </span>
              <span className="text-sm text-muted-foreground">460px · info paneel</span>
            </div>
            <DetailPanelDemo />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 text-xs font-medium border border-violet-500/20">
                mode="form"
              </span>
              <span className="text-sm text-muted-foreground">460px · formulier paneel</span>
            </div>
            <FormPanelDemo />
          </div>
        </div>
      </div>
    </div>
  );
}
