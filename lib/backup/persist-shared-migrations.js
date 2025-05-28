// @flow

import type { DatabaseIdentifier } from '../types/database-identifier-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';

export type SharedMigrationFunction = (
  databaseIdentifier: DatabaseIdentifier,
) => Promise<StoreOperations>;

export type SharedMigrationsManifest = {
  +[number | string]: SharedMigrationFunction,
};
const sharedMigrations: SharedMigrationsManifest = {};

export { sharedMigrations };
