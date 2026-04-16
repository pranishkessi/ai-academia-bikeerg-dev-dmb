import tasks from "../config/ai_tasks.json";

export const AI_TASKS = tasks;

export const AI_TASK_THRESHOLDS = AI_TASKS.map((task) => task.threshold);

export const LEVEL6_WARNING_DELAY_MS = 25000;

export const LEVEL6_WARNING_TEXT =
  "Stark! Sie haben Level 5 geschafft. Die letzte KI-Aufgabe ist besonders schwer: In einer Stunde können Sie 5 Sekunden KI-Video erstellen, wenn Sie konstant mit 100 Watt treten.";