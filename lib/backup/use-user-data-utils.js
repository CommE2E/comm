// @flow

import {
  type AddLogCallback,
  logTypes,
} from '../components/debug-logs-context.js';
import type { AuxUserStoreOperation } from '../ops/aux-user-store-ops.js';
import type { AuxUserInfo } from '../types/aux-user-types.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { IdentityServiceClient } from '../types/identity-service-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';
import { rawDeviceListFromSignedList } from '../utils/device-list-utils.js';

export type StoreAndDatabaseVersions = {
  +mainDatabaseVersion: number,
  +restoredDatabaseVersion: number,
  +mainStoreVersion: number,
  +restoredStoreVersion: number,
};

async function getStoreAndDatabaseVersions(
  addLog: AddLogCallback,
): Promise<StoreAndDatabaseVersions> {
  const { sqliteAPI } = getConfig();

  const [
    mainDatabaseVersion,
    restoredDatabaseVersion,
    restoredStoreVersionString,
  ] = await Promise.all([
    sqliteAPI.getDatabaseVersion(databaseIdentifier.MAIN),
    sqliteAPI.getDatabaseVersion(databaseIdentifier.RESTORED),
    sqliteAPI.getSyncedMetadata(
      syncedMetadataNames.STORE_VERSION,
      databaseIdentifier.RESTORED,
    ),
  ]);

  const mainStoreVersion = getConfig().platformDetails.stateVersion;

  if (!mainStoreVersion || !restoredStoreVersionString) {
    addLog(
      'User Data Restore',
      `Error when restoring user data, main store version(${
        mainStoreVersion ?? 'undefined'
      }) or restored store version (${
        restoredStoreVersionString ?? 'undefined'
      }) are undefined`,
      new Set([logTypes.BACKUP, logTypes.ERROR]),
    );
    throw new Error('version_check_failed');
  }

  const restoredStoreVersion = parseInt(restoredStoreVersionString);

  return {
    mainDatabaseVersion,
    restoredDatabaseVersion,
    mainStoreVersion,
    restoredStoreVersion,
  };
}

async function generateAuxUserOpsToUpdatePeers(
  peerUserIDs: $ReadOnlyArray<string>,
  identityClient: IdentityServiceClient,
): Promise<$ReadOnlyArray<AuxUserStoreOperation>> {
  const [newAuxUserInfos, userIdentities] = await Promise.all([
    identityClient.getDeviceListsForUsers(peerUserIDs),
    identityClient.findUserIdentities(peerUserIDs),
  ]);

  const userIDsToRemove: Array<string> = [];
  const auxUserStoreOperations: Array<AuxUserStoreOperation> = [];
  for (const userID of peerUserIDs) {
    const userIdentity = userIdentities.identities[userID];
    const deviceList = newAuxUserInfos.usersSignedDeviceLists[userID];
    const platformDetails =
      newAuxUserInfos.usersDevicesPlatformDetails[userID] ?? {};

    // when peer doesn't exist on Identity, we should remove it
    const userExists = !!deviceList && !!userIdentity;
    if (!userExists) {
      userIDsToRemove.push(userID);
      continue;
    }

    const auxUserInfo: AuxUserInfo = {
      deviceList: rawDeviceListFromSignedList(deviceList),
      devicesPlatformDetails: platformDetails,
      fid: userIdentity?.farcasterID,
      supportsFarcasterDCs: !!userIdentity?.hasFarcasterDCsToken,
    };
    auxUserStoreOperations.push({
      type: 'replace_aux_user_info',
      payload: { id: userID, auxUserInfo },
    });
  }

  if (userIDsToRemove.length > 0) {
    auxUserStoreOperations.push({
      type: 'remove_aux_user_infos',
      payload: { ids: userIDsToRemove },
    });
  }
  return auxUserStoreOperations;
}

export { getStoreAndDatabaseVersions, generateAuxUserOpsToUpdatePeers };
