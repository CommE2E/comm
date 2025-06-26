// @flow

import {
  incrementColdStartCountActionType,
  recordAlertActionType,
} from '../actions/alert-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import type { SyncedMetadataStoreOperation } from '../ops/synced-metadata-store-ops.js';
import type { AlertStore } from '../types/alert-types.js';
import type { BaseAction } from '../types/redux-types';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';

type ReduceAlertStoreResult = {
  +alertStore: AlertStore,
  +syncedMetadataStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
};

function getUpdatedAlertStoreResult(
  alertStore: AlertStore,
): ReduceAlertStoreResult {
  return {
    alertStore,
    syncedMetadataStoreOperations: [
      {
        type: 'replace_synced_metadata_entry',
        payload: {
          name: syncedMetadataNames.ALERT_STORE,
          data: JSON.stringify(alertStore),
        },
      },
    ],
  };
}

function reduceAlertStore(
  state: AlertStore,
  action: BaseAction,
): ReduceAlertStoreResult {
  if (action.type === recordAlertActionType) {
    return getUpdatedAlertStoreResult({
      ...state,
      alertInfos: {
        ...state.alertInfos,
        [(action.payload.alertType: string)]: {
          ...state.alertInfos[action.payload.alertType],
          totalAlerts:
            state.alertInfos[action.payload.alertType].totalAlerts + 1,
          lastAlertTime: action.payload.time,
        },
      },
    });
  } else if (action.type === incrementColdStartCountActionType) {
    const newAlertInfos = Object.fromEntries(
      Object.entries(state.alertInfos).map(([alertType, info]) => [
        alertType,
        {
          ...info,
          coldStartCount: (info.coldStartCount ?? 0) + 1,
        },
      ]),
    );

    return getUpdatedAlertStoreResult({
      ...state,
      alertInfos: newAlertInfos,
    });
  } else if (action.type === setClientDBStoreActionType) {
    let alertStore = { ...state };
    const alertStoreString =
      action.payload.syncedMetadata?.[syncedMetadataNames.ALERT_STORE];
    if (alertStoreString) {
      alertStore = {
        ...alertStore,
        ...JSON.parse(alertStoreString),
      };
    }
    return {
      alertStore,
      syncedMetadataStoreOperations: [],
    };
  }

  return {
    alertStore: state,
    syncedMetadataStoreOperations: [],
  };
}

export { reduceAlertStore };
