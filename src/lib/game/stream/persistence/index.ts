/**
 * Persistence Layer - Public exports
 *
 * Re-exports types and implementations for storage backends.
 * Currently only file-based storage is implemented, but the
 * interface allows for easy addition of Redis, PostgreSQL, etc.
 */

// Types
export type {
  IEventStore,
  IStateStore,
  IMetadataStore,
  IGameStore,
  FileStoreConfig,
  BatchResult,
} from './types';

// Implementations
export { FileStore, fileStore } from './file-store';
