// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { SyncedMetadataStoreOperation } from '../ops/synced-metadata-store-ops.js';
import type { EnabledApps } from '../types/enabled-apps.js';
import {
  defaultEnabledApps,
  defaultWebEnabledApps,
} from '../types/enabled-apps.js';
import type { BaseAction } from '../types/redux-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

export const enableAppActionType = 'ENABLE_APP';
export const disableAppActionType = 'DISABLE_APP';

type ReduceEnabledAppsResult = {
  +enabledApps: EnabledApps,
  +syncedMetadataStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
};

function getUpdatedEnabledAppsResult(
  enabledApps: EnabledApps,
): ReduceEnabledAppsResult {
  return {
    enabledApps,
    syncedMetadataStoreOperations: [
      {
        type: 'replace_synced_metadata_entry',
        payload: {
          name: syncedMetadataNames.ENABLED_APPS,
          data: JSON.stringify(enabledApps),
        },
      },
    ],
  };
}

export default function reduceEnabledApps(
  state: EnabledApps,
  action: BaseAction,
): ReduceEnabledAppsResult {
  if (action.type === enableAppActionType && action.payload === 'calendar') {
    return getUpdatedEnabledAppsResult({ ...state, calendar: true });
  } else if (
    action.type === disableAppActionType &&
    action.payload === 'calendar'
  ) {
    return getUpdatedEnabledAppsResult({ ...state, calendar: false });
  } else if (action.type === setClientDBStoreActionType) {
    let enabledApps = { ...state };
    const enabledAppsString =
      action.payload.syncedMetadata?.[syncedMetadataNames.ENABLED_APPS];
    if (enabledAppsString) {
      enabledApps = {
        ...enabledApps,
        ...JSON.parse(enabledAppsString),
      };
    }
    return {
      enabledApps,
      syncedMetadataStoreOperations: [],
    };
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    return getUpdatedEnabledAppsResult(
      process.env.BROWSER ? defaultWebEnabledApps : defaultEnabledApps,
    );
  }
  return {
    enabledApps: state,
    syncedMetadataStoreOperations: [],
  };
}
