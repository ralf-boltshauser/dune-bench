/**
 * Benchmark Module
 *
 * Exports for the benchmarking system.
 */

export { BenchmarkRunner } from './benchmark-runner';
export type { BenchmarkRunnerConfig, SingleGameConfig } from './benchmark-runner';
export { aggregateResults, generateReport } from './aggregator';
export { formatDuration, formatPercent } from './utils';

