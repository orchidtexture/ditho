import { isPageVisible, subscribeToPageVisibility } from '../dom/visibility';

export interface ScheduledTask {
  readonly id: number;
  /** Returns whether the task needs continuous animation frames (visible, animated, active) */
  isContinuous(): boolean;
  /** Returns whether the task needs a single dirty frame redraw (e.g. option change while paused, resize) */
  isDirty(): boolean;
  /** Optional target FPS cap */
  getFpsLimit?(): number | null;
  /** Optional batched measurement phase before drawing */
  measure?(): void;
  /** Draws the frame. delta is 0 for static dirty redraws */
  render(delta: number): void;
}

let nextTaskId = 1;
const tasks = new Map<number, ScheduledTask>();
const taskLastRenderTime = new Map<number, number>();
const taskAccumulatedDelta = new Map<number, number>();
let rafId: number | null = null;
let lastTimestamp: number | null = null;
let unsubscribeVisibility: (() => void) | null = null;

function tick(now: number): void {
  if (lastTimestamp === null) {
    lastTimestamp = now;
  }
  // Cap delta to 100ms (0.1s) to prevent physics/noise explosion if frame dropped
  const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
  lastTimestamp = now;

  // 1. Batch measurement phase
  tasks.forEach((task) => {
    if (task.measure) {
      task.measure();
    }
  });

  // 2. Render phase
  let stillNeedsFrames = false;

  tasks.forEach((task) => {
    const continuous = task.isContinuous();
    const dirty = task.isDirty();

    if (continuous) {
      const prev = taskAccumulatedDelta.get(task.id) || 0;
      taskAccumulatedDelta.set(task.id, prev + delta);
    } else {
      taskAccumulatedDelta.set(task.id, 0);
    }

    if (continuous || dirty) {
      // Check optional FPS throttle
      const fpsLimit = task.getFpsLimit ? task.getFpsLimit() : null;
      let shouldDraw = true;

      if (fpsLimit && fpsLimit > 0 && !dirty) {
        const minInterval = 1000 / fpsLimit - 1.0; // 1ms tolerance
        const lastRender = taskLastRenderTime.get(task.id) || 0;
        if (now - lastRender < minInterval) {
          shouldDraw = false;
        }
      }

      if (shouldDraw) {
        const elapsed = continuous ? (taskAccumulatedDelta.get(task.id) || delta) : 0;
        task.render(elapsed);
        taskAccumulatedDelta.set(task.id, 0);
        taskLastRenderTime.set(task.id, now);
      }
    }

    if (task.isContinuous() || task.isDirty()) {
      stillNeedsFrames = true;
    }
  });

  // 3. Schedule next frame or shut down if all idle
  if (stillNeedsFrames && isPageVisible() && tasks.size > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
    lastTimestamp = null;
  }
}

/**
 * Wakes up the shared animation loop if any task needs rendering.
 */
export function requestTick(): void {
  if (rafId !== null) return;
  if (!isPageVisible() || tasks.size === 0) return;

  lastTimestamp = null;
  rafId = requestAnimationFrame(tick);
}

/**
 * Registers an instance with the shared scheduler.
 * Returns an unregister function.
 */
export function registerScheduledTask(task: Omit<ScheduledTask, 'id'>): { id: number; unregister: () => void } {
  const id = nextTaskId++;
  const scheduled: ScheduledTask = { ...task, id };
  tasks.set(id, scheduled);

  if (!unsubscribeVisibility) {
    unsubscribeVisibility = subscribeToPageVisibility((visible) => {
      if (visible) {
        lastTimestamp = null;
        requestTick();
      } else {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
          lastTimestamp = null;
        }
      }
    });
  }

  // Check if we need immediate tick
  if (scheduled.isContinuous() || scheduled.isDirty()) {
    requestTick();
  }

  return {
    id,
    unregister: () => {
      tasks.delete(id);
      taskLastRenderTime.delete(id);
      taskAccumulatedDelta.delete(id);
      if (tasks.size === 0) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
          lastTimestamp = null;
        }
        if (unsubscribeVisibility) {
          unsubscribeVisibility();
          unsubscribeVisibility = null;
        }
      }
    },
  };
}

/**
 * For diagnostic and testing verification:
 * Checks whether the shared animation loop is currently actively requesting frames.
 */
export function isSchedulerActive(): boolean {
  return rafId !== null;
}

/**
 * Returns number of tasks currently registered with scheduler.
 */
export function getRegisteredTaskCount(): number {
  return tasks.size;
}
