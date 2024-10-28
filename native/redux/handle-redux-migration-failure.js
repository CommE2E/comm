// @flow

import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import { defaultState } from './default-state.js';
import { nonUserSpecificFieldsNative, type AppState } from './state-types.js';

const persistBlacklist = [
  'loadingStatuses',
  'lifecycleState',
  'dimensions',
  'draftStore',
  'connectivity',
  'deviceOrientation',
  'frozen',
  'threadStore',
  'initialStateLoaded',
  'dbOpsStore',
  'syncedMetadataStore',
  'userStore',
  'auxUserStore',
  'commServicesAccessToken',
  'inviteLinksStore',
  'integrityStore',
];

function handleReduxMigrationFailure(oldState: AppState): AppState {
  const persistedNonUserSpecificFields = nonUserSpecificFieldsNative.filter(
    field => !persistBlacklist.includes(field) || field === '_persist',
  );
  const stateAfterReset = resetUserSpecificState(
    oldState,
    defaultState,
    persistedNonUserSpecificFields,
  );
  return {
    ...stateAfterReset,
    keyserverStore: wipeKeyserverStore(stateAfterReset.keyserverStore),
  };
}

export { persistBlacklist, handleReduxMigrationFailure };
