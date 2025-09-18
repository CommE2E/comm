// @flow

import type { ClientDBSyncedMetadataStoreOperation } from '../ops/synced-metadata-store-ops.js';
import { createReplaceSyncedMetadataOperation } from '../ops/synced-metadata-store-ops.js';
import { alertTypes, defaultAlertInfo } from '../types/alert-types.js';
import type { DatabaseIdentifier } from '../types/database-identifier-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';

export type SharedMigrationFunction = (
  databaseIdentifier: DatabaseIdentifier,
) => Promise<StoreOperations>;

export type SharedMigrationsManifest = {
  +[number | string]: SharedMigrationFunction,
};
const sharedMigrations: SharedMigrationsManifest = {
  [96]: (async (databaseIdentifier: DatabaseIdentifier) => {
    const { sqliteAPI } = getConfig();

    const clientStoreToMigrate =
      await sqliteAPI.getClientDBStore(databaseIdentifier);

    if (!clientStoreToMigrate.syncedMetadata) {
      return {};
    }

    const alertStore = JSON.parse(
      clientStoreToMigrate.syncedMetadata[syncedMetadataNames.ALERT_STORE],
    );
    const updatedAlertStore = {
      ...alertStore,
      alertInfos: {
        ...alertStore.alertInfos,
        [alertTypes.CONNECT_FARCASTER]: defaultAlertInfo,
      },
    };

    const syncedMetadataStoreOperations: $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation> =
      [
        createReplaceSyncedMetadataOperation(
          syncedMetadataNames.ALERT_STORE,
          JSON.stringify(updatedAlertStore),
        ),
      ];

    return {
      syncedMetadataStoreOperations,
    };
  }: SharedMigrationFunction),
  [97]: (async () => {
    // We're performing an empty migration here to ensure that the clients
    // won't receive an unsupported message through the backup.
    // COMPOUND_REACTION message is created only locally, but it's also
    // added to a backup. It is possible that an older client will try to
    // restore a backup including these messages. We want to avoid this
    // because the message isn't supported on the older version. This
    // migration ensures that the backup can't be restored on clients that
    // don't support this message type.
    return {};
  }: SharedMigrationFunction),
};

export { sharedMigrations };
