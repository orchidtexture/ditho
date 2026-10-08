import { describe, it, expect, beforeEach } from 'vitest';
import {
  setContextBudget,
  getContextBudget,
  getActiveContextCount,
  acquireContextBudget,
  releaseContextBudget,
  resetContextBudget,
} from '../src/core/budget';

describe('Context Budget (budget.ts)', () => {
  beforeEach(() => {
    resetContextBudget(3);
  });

  it('initializes with specified limit and zero active contexts', () => {
    expect(getContextBudget()).toBe(3);
    expect(getActiveContextCount()).toBe(0);
  });

  it('allows acquisitions up to the configured limit', () => {
    expect(acquireContextBudget()).toBe(true);
    expect(acquireContextBudget()).toBe(true);
    expect(acquireContextBudget()).toBe(true);
    expect(getActiveContextCount()).toBe(3);

    // 4th acquisition exceeds budget
    expect(acquireContextBudget()).toBe(false);
    expect(getActiveContextCount()).toBe(3);
  });

  it('allows releasing slots and re-acquiring', () => {
    acquireContextBudget();
    acquireContextBudget();
    acquireContextBudget();

    releaseContextBudget();
    expect(getActiveContextCount()).toBe(2);

    expect(acquireContextBudget()).toBe(true);
    expect(getActiveContextCount()).toBe(3);
  });

  it('updates limit dynamically with setContextBudget', () => {
    setContextBudget(5);
    expect(getContextBudget()).toBe(5);
  });
});
