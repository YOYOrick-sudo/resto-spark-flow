import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Clock, MessageSquare } from "lucide-react";
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
import {
  Table,
  getTablesByZone,
  getActiveZones,
  checkTimeConflict,
  timeToMinutes,
  minutesToTime,
} from "@/data/reservations";
import { cn } from "@/lib/utils";

// --- Schema ---

const quickReservationSchema = z.object({
  guestName: z.string().min(1, "Naam is verplicht").max(100),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Ongeldige tijd"),
  guests: z.coerce.number().min(1, "Min 1 gast").max(20, "Max 20 gasten"),
  tableId: z.string().min(1, "Selecteer een tafel"),
  duration: z.coerce.number().min(30).max(300),
  notes: z.string().max(500).optional(),
});

type QuickReservationForm = z.infer<typeof quickReservationSchema>;

// --- Props ---

interface QuickReservationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTime: string | null;
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

// --- Helper: Get available tables for a time slot ---

function getAvailableTablesForSlot(
  date: string,
  startTime: string,
  durationMinutes: number,
  guestCount: number
): Table[] {
  const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);
  const zones = getActiveZones();
  const allTables: Table[] = [];

  for (const zone of zones) {
    const tables = getTablesByZone(zone.id);
    for (const table of tables) {
      // Check capacity
      if (table.maxCapacity < guestCount) continue;

      // Check for conflicts
      const conflict = checkTimeConflict(table.id, date, startTime, endTime);
      if (!conflict.hasConflict) {
        allTables.push(table);
      }
    }
  }

  return allTables.sort((a, b) => a.number - b.number);
}

// --- Generate time options ---

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 11; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
}

// --- Component ---

export function QuickReservationPanel({
  open,
  onOpenChange,
  initialTime,
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
      tableId: "",
      duration: 90,
      notes: "",
    },
  });

  // Reset form when panel opens with new time
  useEffect(() => {
    if (open && initialTime) {
      form.reset({
        guestName: "",
        time: initialTime,
        guests: 2,
        tableId: "",
        duration: 90,
        notes: "",
      });
      setIsWalkIn(false);
    }
  }, [open, initialTime, form]);

  const watchedTime = form.watch("time");
  const watchedGuests = form.watch("guests");
  const watchedDuration = form.watch("duration");

  // Get available tables based on current form values
  const availableTables = useMemo(() => {
    if (!watchedTime) return [];
    return getAvailableTablesForSlot(date, watchedTime, watchedDuration, watchedGuests);
  }, [date, watchedTime, watchedDuration, watchedGuests]);

  // Auto-select first available table if current selection becomes unavailable
  useEffect(() => {
    const currentTableId = form.getValues("tableId");
    if (availableTables.length > 0 && !availableTables.find(t => t.id === currentTableId)) {
      form.setValue("tableId", availableTables[0].id);
    }
  }, [availableTables, form]);

  const handleFormSubmit = (data: QuickReservationForm) => {
    onSubmit({
      guestName: data.guestName,
      time: data.time,
      guests: data.guests,
      tableId: data.tableId,
      duration: data.duration,
      notes: data.notes,
      isWalkIn,
    });
    onOpenChange(false);
  };

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
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors border-[1.5px]",
                !isWalkIn
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              Reservering
            </button>
            <button
              type="button"
              onClick={() => setIsWalkIn(true)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors border-[1.5px]",
                isWalkIn
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              Walk-in
            </button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
            {/* Guest Name */}
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
                      <Input
                        placeholder="Naam van de gast"
                        {...field}
                        className="border-[1.5px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Time & Guests Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Tijd
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[1.5px]">
                          <SelectValue placeholder="Selecteer tijd" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
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
                      <Users className="inline h-3 w-3 mr-1" />
                      Gasten
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        {...field}
                        className="border-[1.5px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Table Selection */}
            <FormField
              control={form.control}
              name="tableId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tafel
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-[1.5px]">
                        <SelectValue placeholder="Selecteer tafel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {availableTables.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Geen tafels beschikbaar
                        </div>
                      ) : (
                        availableTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Tafel {table.number} ({table.minCapacity}-{table.maxCapacity} pers.)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Duur
                  </FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="border-[1.5px]">
                        <SelectValue placeholder="Selecteer duur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MessageSquare className="inline h-3 w-3 mr-1" />
                    Notities
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optionele opmerkingen..."
                      className="resize-none border-[1.5px]"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <NestoButton
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuleren
              </NestoButton>
              <NestoButton
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={availableTables.length === 0}
              >
                {isWalkIn ? "Maak Walk-in" : "Maak Reservering"}
              </NestoButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
