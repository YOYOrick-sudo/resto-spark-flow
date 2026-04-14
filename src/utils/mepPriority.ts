import { differenceInMinutes } from "date-fns";
import type { MepTask } from "@/hooks/useMepTasks";

export interface IngredientStockItem {
  naam: string;
  voorraad: number;
  min_voorraad: number;
  eenheid: string;
}

export type IngredientStockMap = Map<string, IngredientStockItem[]>;

function parseDeadlineToday(deadline: string): Date {
  const [h, m] = deadline.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function isOverdue(task: MepTask): boolean {
  if (!task.deadline || task.status === "completed" || task.status === "cancelled") return false;
  return new Date() > parseDeadlineToday(task.deadline);
}

function hasLowStock(task: MepTask, stock: IngredientStockMap): boolean {
  if (!task.recept_id) return false;
  const items = stock.get(task.recept_id);
  if (!items) return false;
  return items.some((i) => i.voorraad < i.min_voorraad);
}

function getTotalPrepTime(task: MepTask): number {
  if (!task.recept) return 0;
  return (task.recept.actieve_bereidingstijd ?? 0) + (task.recept.passieve_bereidingstijd ?? 0);
}

export function calculatePriorityScore(task: MepTask, stock: IngredientStockMap): number {
  let score = 0;

  // Overdue = highest
  if (isOverdue(task)) score += 10000;

  // Manual priority
  if (task.prioriteit === "Hoog") score += 5000;
  if (task.prioriteit === "Laag") score -= 5000;

  // Low stock — affects sorting only, no visible hint
  if (hasLowStock(task, stock)) score += 2000;

  // Prep time — longer = start earlier
  const totalTime = getTotalPrepTime(task);
  if (totalTime > 60) score += 1000;
  else if (totalTime > 30) score += 500;

  // Deadline proximity
  if (task.deadline) {
    const minutesUntil = differenceInMinutes(parseDeadlineToday(task.deadline), new Date());
    score += Math.max(0, 1000 - minutesUntil);
  }

  return score;
}

export function getAssistantHint(task: MepTask): string | null {
  const activePrepTime = task.recept?.actieve_bereidingstijd ?? 0;
  const passivePrepTime = task.recept?.passieve_bereidingstijd ?? 0;
  const totalTime = activePrepTime + passivePrepTime;

  // Timing hint: long prep + deadline approaching
  if (totalTime > 30 && task.deadline) {
    const minutesUntil = differenceInMinutes(parseDeadlineToday(task.deadline), new Date());
    if (minutesUntil > 0 && minutesUntil < totalTime + 15) {
      return `Duurt ${totalTime} min — begin nu om op tijd klaar te zijn`;
    }
  }

  // Passive time hint: has waiting time that can be combined
  if (passivePrepTime > 0) {
    return `Inclusief ${passivePrepTime} min wachttijd — combineer met andere taken`;
  }

  return null;
}

export function isTaskOverdue(task: MepTask): boolean {
  return isOverdue(task);
}
