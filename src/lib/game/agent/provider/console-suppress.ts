/**
 * Console Warning Suppression
 *
 * Utility to suppress specific console warnings during AI SDK operations.
 */

/**
 * Pattern to match schema serialization warnings
 */
const SCHEMA_WARNING_PATTERN = "Transforms cannot be represented in JSON Schema";

/**
 * Check if a message is a schema serialization warning.
 */
export function isSchemaWarning(message: string): boolean {
  return message.includes(SCHEMA_WARNING_PATTERN);
}

/**
 * Suppress AI SDK schema serialization warnings during an operation.
 * Returns a restore function to call after the operation completes.
 *
 * @example
 * ```typescript
 * const restore = suppressSchemaWarnings();
 * try {
 *   // Your operation that might generate warnings
 * } finally {
 *   restore();
 * }
 * ```
 */
export function suppressSchemaWarnings(): () => void {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || "";
    if (isSchemaWarning(message)) {
      return; // Suppress this specific warning
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || "";
    if (isSchemaWarning(message)) {
      return; // Suppress this specific error
    }
    originalError.apply(console, args);
  };

  // Return restore function
  return () => {
    console.warn = originalWarn;
    console.error = originalError;
  };
}

