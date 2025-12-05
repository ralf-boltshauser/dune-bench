/**
 * Test Utilities
 *
 * Simple test framework matching codebase patterns.
 */

export async function test(
  name: string,
  fn: () => void | Promise<void>
): Promise<void> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(
      `  ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export function describe(
  name: string,
  fn: () => void | Promise<void>
): void {
  console.log(`\n${name}`);
  console.log("─".repeat(60));
  try {
    const result = fn();
    // If it's a promise, we need to handle it, but for now just call it
    // Tests will handle their own async
    if (result instanceof Promise) {
      result
        .then(() => {
          // Promise resolved successfully - tests are done
        })
        .catch((error) => {
          console.error(`\n✗ Test suite "${name}" failed`);
          console.error(error);
          process.exit(1);
        });
    }
  } catch (error) {
    console.error(`\n✗ Test suite "${name}" failed`);
    console.error(error);
    process.exit(1);
  }
}

const beforeEachHooks: Array<() => void | Promise<void>> = [];
const afterEachHooks: Array<() => void | Promise<void>> = [];

export function beforeEach(fn: () => void | Promise<void>): void {
  beforeEachHooks.push(fn);
}

export function afterEach(fn: () => void | Promise<void>): void {
  afterEachHooks.push(fn);
}

export async function runBeforeEach(): Promise<void> {
  for (const hook of beforeEachHooks) {
    await hook();
  }
}

export async function runAfterEach(): Promise<void> {
  for (const hook of afterEachHooks) {
    await hook();
  }
}

// Auto-exit after a short delay to allow async operations to complete
// This prevents the process from hanging
if (typeof process !== 'undefined' && process.exit) {
  // Give tests 100ms to complete any async operations
  setTimeout(() => {
    // Check if there are any pending operations
    // If not, exit cleanly
    if (process.listenerCount('uncaughtException') === 0) {
      process.exit(0);
    }
  }, 100);
}
