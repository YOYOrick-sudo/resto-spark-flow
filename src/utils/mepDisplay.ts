import type { MepTask } from "@/hooks/useMepTasks";

/**
 * Get the display unit for a MEP task, with fallback chain:
 * visuele_eenheid → output_hoeveelheid+eenheid → target_eenheid
 */
export function getDisplayEenheid(task: MepTask): string | null {
  if (task.methode?.visuele_eenheid) {
    return task.methode.visuele_eenheid.replace(/^1\s+/, '');
  }
  if (task.methode) {
    return `${task.methode.output_hoeveelheid} ${task.methode.output_eenheid}`;
  }
  if (task.target_eenheid) {
    return task.target_eenheid;
  }
  return null;
}

/**
 * Format task amount as "3× GN1/3"
 */
export function formatTaskAmount(task: MepTask): string | null {
  const eenheid = getDisplayEenheid(task);
  if (!eenheid) return null;
  const units = task.units ?? 1;
  return `${units}× ${eenheid}`;
}

/**
 * Format total output as "4.5 kg totaal"
 */
export function formatTaskTotal(task: MepTask): string | null {
  if (!task.methode || !task.units) return null;
  const total = task.methode.output_hoeveelheid * task.units;
  if (total <= 0) return null;
  const rounded = total % 1 === 0 ? total.toString() : total.toFixed(1);
  return `${rounded} ${task.methode.output_eenheid} totaal`;
}
