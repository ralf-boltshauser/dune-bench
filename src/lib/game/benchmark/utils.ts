/**
 * Benchmark Utilities
 *
 * Shared utility functions for the benchmarking module.
 */

// =============================================================================
// DURATION FORMATTING
// =============================================================================

/**
 * Format duration in milliseconds to human-readable string.
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2h 15m 30s", "45m 12s", "30s")
 * 
 * @example
 * ```typescript
 * formatDuration(7323000); // "2h 2m 3s"
 * formatDuration(45000);   // "45s"
 * ```
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// =============================================================================
// PERCENTAGE FORMATTING
// =============================================================================

/**
 * Format a decimal value (0-1) as a percentage string.
 * 
 * @param value - Decimal value between 0 and 1
 * @returns Formatted percentage string (e.g., "45.67%")
 * 
 * @example
 * ```typescript
 * formatPercent(0.4567); // "45.67%"
 * formatPercent(1.0);    // "100.00%"
 * ```
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

