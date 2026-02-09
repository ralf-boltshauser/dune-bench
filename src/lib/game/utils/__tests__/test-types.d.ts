/**
 * Type declarations for test functions used in test files.
 * These are minimal declarations to satisfy TypeScript when test files use Jest/Mocha-style syntax.
 */

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare const expect: {
  (value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toContain(item: unknown): void;
    toHaveLength(length: number): void;
    toThrow(error?: string | Error | RegExp): void;
    not: {
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toContain(item: unknown): void;
      toHaveLength(length: number): void;
    };
  };
};











