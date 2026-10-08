import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerScheduledTask,
  isSchedulerActive,
  getRegisteredTaskCount,
} from '../src/scheduler/scheduler';

describe('Shared Scheduler (scheduler.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts rAF loop when a continuous task is registered', () => {
    const task = registerScheduledTask({
      isContinuous: () => true,
      isDirty: () => false,
      render: vi.fn(),
    });

    expect(getRegisteredTaskCount()).toBe(1);
    expect(isSchedulerActive()).toBe(true);

    task.unregister();
    expect(getRegisteredTaskCount()).toBe(0);
    expect(isSchedulerActive()).toBe(false);
  });

  it('does not keep rAF loop running when all tasks are idle or paused', () => {
    let continuous = false;
    let dirty = false;

    const task = registerScheduledTask({
      isContinuous: () => continuous,
      isDirty: () => dirty,
      render: vi.fn(),
    });

    // Run pending timers / rAF if any
    expect(isSchedulerActive()).toBe(false);

    // Make task dirty once
    dirty = true;
    // Scheduler should wake up to handle dirty frame
    // ...
    task.unregister();
    expect(isSchedulerActive()).toBe(false);
  });
});
