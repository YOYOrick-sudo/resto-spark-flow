import { addMinutes, setHours, setMinutes, setSeconds } from "date-fns";
import type { MepTask } from "@/hooks/useMepTasks";

export interface PlannedStep {
  task_id: string;
  task_title: string;
  start_time: Date;
  active_minutes: number;
  passive_minutes: number;
  is_followup: boolean;
  note?: string;
}

interface WaitingTask {
  task: MepTask;
  returnTime: Date;
}

function getActiveMinutes(task: MepTask): number {
  return task.recept?.actieve_bereidingstijd ?? 15;
}

function getPassiveMinutes(task: MepTask): number {
  return task.recept?.passieve_bereidingstijd ?? 0;
}

function getFollowUpMinutes(task: MepTask): number {
  return Math.max(5, Math.round(getActiveMinutes(task) / 4));
}

function getDefaultStart(): Date {
  const now = new Date();
  if (now.getHours() < 9) {
    return setSeconds(setMinutes(setHours(now, 9), 0), 0);
  }
  const mins = now.getMinutes();
  const rounded = Math.ceil(mins / 5) * 5;
  const d = setSeconds(setMinutes(new Date(now), rounded % 60), 0);
  if (rounded >= 60) d.setHours(d.getHours() + 1);
  return d;
}

function parseDeadline(task: MepTask): Date | null {
  if (!task.deadline) return null;
  const [h, m] = task.deadline.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function planDay(tasks: MepTask[], startTime?: Date): PlannedStep[] {
  const open = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  );
  if (open.length === 0) return [];

  const sorted = [...open].sort((a, b) => {
    // in_progress first
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;

    // Tasks with passive time first (longest first)
    const passA = getPassiveMinutes(a);
    const passB = getPassiveMinutes(b);
    if (passA > 0 && passB === 0) return -1;
    if (passB > 0 && passA === 0) return 1;
    if (passA !== passB) return passB - passA;

    // Deadline urgency
    const dlA = parseDeadline(a);
    const dlB = parseDeadline(b);
    if (dlA && !dlB) return -1;
    if (dlB && !dlA) return 1;
    if (dlA && dlB) return dlA.getTime() - dlB.getTime();

    // Priority
    const prioMap: Record<string, number> = { Hoog: 3, Normaal: 2, Laag: 1 };
    return (prioMap[b.prioriteit] ?? 2) - (prioMap[a.prioriteit] ?? 2);
  });

  const steps: PlannedStep[] = [];
  const waitQueue: WaitingTask[] = [];
  const scheduled = new Set<string>();
  let currentTime = startTime ?? getDefaultStart();

  function insertDueFollowUps() {
    waitQueue.sort((a, b) => a.returnTime.getTime() - b.returnTime.getTime());
    while (waitQueue.length > 0 && waitQueue[0].returnTime <= currentTime) {
      const w = waitQueue.shift()!;
      const followUp = getFollowUpMinutes(w.task);
      steps.push({
        task_id: w.task.id,
        task_title: w.task.title,
        start_time: new Date(currentTime),
        active_minutes: followUp,
        passive_minutes: 0,
        is_followup: true,
        note: "Afmaken",
      });
      currentTime = addMinutes(currentTime, followUp);
    }
  }

  for (const task of sorted) {
    if (scheduled.has(task.id)) continue;

    insertDueFollowUps();

    const active = getActiveMinutes(task);
    const passive = getPassiveMinutes(task);

    const waitingNames = waitQueue.map((w) => w.task.title);

    steps.push({
      task_id: task.id,
      task_title: task.title,
      start_time: new Date(currentTime),
      active_minutes: active,
      passive_minutes: passive,
      is_followup: false,
      note: waitingNames.length > 0
        ? `terwijl ${waitingNames[0]} wacht`
        : undefined,
    });

    scheduled.add(task.id);
    currentTime = addMinutes(currentTime, active);

    if (passive > 0) {
      waitQueue.push({
        task,
        returnTime: addMinutes(currentTime, passive),
      });
    }
  }

  // Flush remaining follow-ups
  while (waitQueue.length > 0) {
    waitQueue.sort((a, b) => a.returnTime.getTime() - b.returnTime.getTime());
    const w = waitQueue.shift()!;
    if (w.returnTime > currentTime) {
      currentTime = w.returnTime;
    }
    const followUp = getFollowUpMinutes(w.task);
    steps.push({
      task_id: w.task.id,
      task_title: w.task.title,
      start_time: new Date(currentTime),
      active_minutes: followUp,
      passive_minutes: 0,
      is_followup: true,
      note: "Afmaken",
    });
    currentTime = addMinutes(currentTime, followUp);
  }

  return steps;
}

export function getEstimatedEndTime(steps: PlannedStep[]): Date | null {
  if (steps.length === 0) return null;
  const last = steps[steps.length - 1];
  return addMinutes(last.start_time, last.active_minutes);
}
