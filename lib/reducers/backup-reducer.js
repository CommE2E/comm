// @flow

import invariant from 'invariant';

import {
  createUserDataBackupActionTypes,
  createUserKeysBackupActionTypes,
  restoreUserDataStepActionTypes,
} from '../actions/backup-actions.js';
import { changeIdentityUserPasswordActionTypes } from '../actions/user-actions.js';
import type {
  BackupStore,
  RestoreBackupState,
  RestoreUserDataStep,
} from '../types/backup-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceBackupStore(
  store: BackupStore,
  action: BaseAction,
): BackupStore {
  if (action.type === createUserKeysBackupActionTypes.success) {
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
  if (action.type === createUserKeysBackupActionTypes.started) {
    return { ...store, status: 'user_keys_backup_started', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.success) {
    invariant(
      store.status === 'user_keys_backup_started' ||
        store.status === 'no_backup',
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
  'restore_database',
  'migrate_backup_schema',
  'run_restored_backup_migrations',
  'copy_content_from_backup_db',
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
