let contextBudget = 8;
let activeContexts = 0;

/**
 * Configure the maximum number of concurrent active WebGL contexts allowed.
 * Defaults to 8. Browsers limit simultaneous WebGL contexts (often 8–16).
 */
export function setContextBudget(limit: number): void {
  contextBudget = Math.max(1, Math.floor(limit));
}

/**
 * Returns current context budget limit.
 */
export function getContextBudget(): number {
  return contextBudget;
}

/**
 * Returns current number of active WebGL contexts in use by the library.
 */
export function getActiveContextCount(): number {
  return activeContexts;
}

/**
 * Tries to allocate a context budget slot.
 * Returns true if slot was acquired, false if budget limit has been reached.
 */
export function acquireContextBudget(): boolean {
  if (activeContexts >= contextBudget) {
    return false;
  }
  activeContexts++;
  return true;
}

/**
 * Releases an allocated context budget slot.
 */
export function releaseContextBudget(): void {
  activeContexts = Math.max(0, activeContexts - 1);
}

/**
 * Reset budget state (primarily for test cleanup).
 */
export function resetContextBudget(newLimit: number = 8): void {
  contextBudget = newLimit;
  activeContexts = 0;
}
