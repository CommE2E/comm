// @flow

import invariant from 'invariant';

import {
  createUserDataBackupActionTypes,
  createUserKeysBackupActionTypes,
  restoreUserDataStepActionTypes,
  markBackupAsRestoredActionType,
  resetBackupRestoreStateActionType,
} from '../actions/backup-actions.js';
import {
  changeIdentityUserPasswordActionTypes,
  logOutActionTypes,
  restoreUserActionTypes,
} from '../actions/user-actions.js';
import {
  restoreUserDataSteps,
  type BackupStore,
  type RestoreBackupState,
  type RestoreUserDataStep,
} from '../types/backup-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { fullBackupSupport } from '../utils/services-utils.js';

function reduceBackupStore(
  store: BackupStore,
  action: BaseAction,
): BackupStore {
  if (action.type === restoreUserActionTypes.success) {
    const { latestBackupInfo } = action.payload;
    return {
      ...store,
      latestBackupInfo,
    };
  } else if (action.type === createUserKeysBackupActionTypes.success) {
    const latestBackupInfo = action.payload;
    return {
      ...store,
      latestBackupInfo,
    };
  } else if (action.type === createUserDataBackupActionTypes.success) {
    const { latestBackupInfo, latestDatabaseVersion } = action.payload;
    return {
      ...store,
      latestBackupInfo,
      latestDatabaseVersion,
    };
  } else if (action.type === changeIdentityUserPasswordActionTypes.success) {
    return {
      ...store,
      latestBackupInfo: null,
    };
  }
  return store;
}

function reduceRestoreBackupState(
  store: RestoreBackupState,
  action: BaseAction,
): RestoreBackupState {
  if (!fullBackupSupport) {
    return store;
  }

  if (
    action.type === resetBackupRestoreStateActionType ||
    action.type === logOutActionTypes.success
  ) {
    return {
      ...store,
      status: 'no_backup',
      payload: {},
    };
  } else if (action.type === markBackupAsRestoredActionType) {
    return {
      ...store,
      status: 'user_data_restore_completed',
      payload: {},
    };
  }

  if (action.type === restoreUserActionTypes.success) {
    invariant(
      store.status === 'no_backup',
      `Restore protocol dispatched but backup state was '${store.status}'`,
    );
    return { ...store, status: 'user_keys_backup_success', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.started) {
    return { ...store, status: 'user_keys_backup_started', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.success) {
    invariant(
      store.status === 'user_keys_backup_started',
      'UserKeys backup success dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_keys_backup_success', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.failed) {
    invariant(
      store.status === 'user_keys_backup_started',
      'UserKeys backup failure dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_keys_backup_failed', payload: {} };
  } else if (action.type === createUserDataBackupActionTypes.started) {
    return { ...store, status: 'user_data_backup_started', payload: {} };
  } else if (action.type === createUserDataBackupActionTypes.success) {
    invariant(
      store.status === 'user_data_backup_started',
      'UserData backup success dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_data_backup_success' };
  } else if (action.type === createUserDataBackupActionTypes.failed) {
    invariant(
      store.status === 'user_data_backup_started',
      'UserData backup failure dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_data_backup_failed' };
  }

  // restoreUserDataStepActionTypes
  if (action.type === restoreUserDataStepActionTypes.started) {
    const { step } = action.payload;
    validateUserDataRestoreStepOrder(store, step);

    return {
      status: 'user_data_restore_started',
      payload: { step },
    };
  } else if (action.type === restoreUserDataStepActionTypes.success) {
    // For success actions, we need to get the current step from the store state
    if (store.status === 'user_data_restore_started') {
      const { step } = store.payload;
      // If this was the last step, mark restore as completed
      if (step === 'copy_content_from_backup_db') {
        return {
          status: 'user_data_restore_completed',
          payload: {},
        };
      }
      return {
        status: 'user_data_restore_step_completed',
        payload: { step },
      };
    }
    return store;
  } else if (action.type === restoreUserDataStepActionTypes.failed) {
    // For failed actions, we need to get the current step from the store state
    if (store.status === 'user_data_restore_started') {
      const { payload: error } = action;
      const { step } = store.payload;
      return {
        status: 'user_data_restore_failed',
        payload: { step, error },
      };
    }
    return store;
  }

  return store;
}

const stepOrder: $ReadOnlyArray<RestoreUserDataStep> = [
  restoreUserDataSteps.RESTORE_DATABASE,
  restoreUserDataSteps.MIGRATE_BACKUP_SCHEMA,
  restoreUserDataSteps.RUN_RESTORED_BACKUP_MIGRATIONS,
  restoreUserDataSteps.COPY_CONTENT_FROM_BACKUP_DB,
];
function validateUserDataRestoreStepOrder(
  store: RestoreBackupState,
  step: RestoreUserDataStep,
) {
  const currentStepIndex = stepOrder.indexOf(step);

  if (store.status === 'user_data_restore_step_completed') {
    const lastCompletedStepIndex = stepOrder.indexOf(store.payload.step);
    invariant(
      currentStepIndex === lastCompletedStepIndex + 1,
      `Invalid step order: trying to start '${step}' but last completed step was '${store.payload.step}'`,
    );
  } else if (store.status === 'user_data_restore_started') {
    invariant(
      currentStepIndex === stepOrder.indexOf(store.payload.step),
      `Invalid step: trying to restart '${step}' but current step is '${store.payload.step}'`,
    );
  } else {
    // Starting fresh - should always start with first step
    invariant(
      step === 'restore_database',
      `Invalid starting step: expected 'restore_database' but got '${step}'`,
    );
  }
}

export { reduceBackupStore, reduceRestoreBackupState };
