// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import { legacyLogInActionTypes } from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { SyncedMetadataStoreOperation } from '../ops/synced-metadata-store-ops.js';
import { createReplaceSyncedMetadataOperation } from '../ops/synced-metadata-store-ops.js';
import type { BaseAction } from '../types/redux-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import {
  defaultGlobalThemeInfo,
  type GlobalThemeInfo,
} from '../types/theme-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

type ReduceGlobalThemeInfoResult = {
  +globalThemeInfo: GlobalThemeInfo,
  +syncedMetadataStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
};

function getUpdatedGlobalThemeInfoResult(
  globalThemeInfo: GlobalThemeInfo,
): ReduceGlobalThemeInfoResult {
  return {
    globalThemeInfo,
    syncedMetadataStoreOperations: [
      createReplaceSyncedMetadataOperation(
        syncedMetadataNames.GLOBAL_THEME_INFO,
        JSON.stringify(globalThemeInfo),
      ),
    ],
  };
}

export default function reduceGlobalThemeInfo(
  state: GlobalThemeInfo,
  action: BaseAction,
): ReduceGlobalThemeInfoResult {
  if (action.type === legacyLogInActionTypes.success) {
    return getUpdatedGlobalThemeInfoResult(defaultGlobalThemeInfo);
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    return getUpdatedGlobalThemeInfoResult(defaultGlobalThemeInfo);
  } else if (action.type === updateThemeInfoActionType) {
    return getUpdatedGlobalThemeInfoResult({
      ...state,
      ...action.payload,
    });
  } else if (action.type === setClientDBStoreActionType) {
    let globalThemeInfo = { ...state };
    const globalThemeInfoString =
      action.payload.syncedMetadata?.[syncedMetadataNames.GLOBAL_THEME_INFO];
    if (globalThemeInfoString) {
      globalThemeInfo = {
        ...globalThemeInfo,
        ...JSON.parse(globalThemeInfoString),
      };
    }
    return {
      globalThemeInfo,
      syncedMetadataStoreOperations: [],
    };
  }
  return {
    globalThemeInfo: state,
    syncedMetadataStoreOperations: [],
  };
}
