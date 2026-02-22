import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Clock, MessageSquare, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NestoButton } from "@/components/polar/NestoButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const quickReservationSchema = z.object({
  guestName: z.string().min(1, "Naam is verplicht").max(100),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Ongeldige tijd"),
  guests: z.coerce.number().min(1, "Min 1 gast").max(20, "Max 20 gasten"),
  tableId: z.string().optional(),
  duration: z.coerce.number().min(30).max(300),
  notes: z.string().max(500).optional(),
});

type QuickReservationForm = z.infer<typeof quickReservationSchema>;

interface QuickReservationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTime: string | null;
  initialTableId?: string | null;
  date: string;
  onSubmit: (data: {
    guestName: string;
    time: string;
    guests: number;
    tableId: string;
    duration: number;
    notes?: string;
    isWalkIn: boolean;
  }) => void;
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 11; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
}

export function QuickReservationPanel({
  open,
  onOpenChange,
  initialTime,
  initialTableId,
  date,
  onSubmit,
}: QuickReservationPanelProps) {
  const [isWalkIn, setIsWalkIn] = useState(false);

  const form = useForm<QuickReservationForm>({
    resolver: zodResolver(quickReservationSchema),
    defaultValues: {
      guestName: "",
      time: initialTime || "18:00",
      guests: 2,
      tableId: initialTableId || "",
      duration: 90,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        guestName: "",
        time: initialTime || "18:00",
        guests: 2,
        tableId: initialTableId || "",
        duration: 90,
        notes: "",
      });
      setIsWalkIn(false);
    }
  }, [open, initialTime, initialTableId, form]);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const durationOptions = [
    { value: 60, label: "60 min" },
    { value: 90, label: "90 min" },
    { value: 120, label: "120 min" },
    { value: 150, label: "150 min" },
    { value: 180, label: "180 min" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-bold">
            {isWalkIn ? "Walk-in toevoegen" : "Reservering toevoegen"}
          </SheetTitle>
        </SheetHeader>

        {/* Disabled notice */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Binnenkort beschikbaar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reserveringen aanmaken wordt beschikbaar in de volgende update. Gebruik het volledige reserveringsformulier (4.7b).
            </p>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsWalkIn(false)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors",
                !isWalkIn
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                  : "bg-transparent text-muted-foreground border border-border hover:bg-accent hover:text-foreground"
              )}
            >
              Reservering
            </button>
            <button
              type="button"
              onClick={() => setIsWalkIn(true)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors",
                isWalkIn
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                  : "bg-transparent text-muted-foreground border border-border hover:bg-accent hover:text-foreground"
              )}
            >
              Walk-in
            </button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {!isWalkIn && (
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Naam
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Naam van de gast" {...field} className="border-[1.5px]" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Clock className="inline h-3 w-3 mr-1" />Tijd
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger className="border-[1.5px]">
                          <SelectValue placeholder="Selecteer tijd" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Users className="inline h-3 w-3 mr-1" />Gasten
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={20} {...field} className="border-[1.5px]" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MessageSquare className="inline h-3 w-3 mr-1" />Notities
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optionele opmerkingen..." className="resize-none" rows={3} {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <NestoButton type="button" variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
                Annuleren
              </NestoButton>
              <NestoButton type="button" variant="primary" className="flex-1" disabled>
                Binnenkort beschikbaar
              </NestoButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
