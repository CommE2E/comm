// @flow

import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import { defaultWebState } from './default-state.js';
import { nonUserSpecificFieldsWeb, type AppState } from './redux-setup.js';

const persistWhitelist = [
  'commServicesAccessToken',
  'customServer',
  'messageStore',
  'tunnelbrokerDeviceToken',
  'restoreBackupState',
];

function handleReduxMigrationFailure(oldState: AppState): AppState {
  const persistedNonUserSpecificFields = nonUserSpecificFieldsWeb.filter(
    field => persistWhitelist.includes(field) || field === '_persist',
  );
  const stateAfterReset = resetUserSpecificState(
    oldState,
    defaultWebState,
    persistedNonUserSpecificFields,
  );
  return {
    ...stateAfterReset,
    keyserverStore: wipeKeyserverStore(stateAfterReset.keyserverStore),
  };
}

export { persistWhitelist, handleReduxMigrationFailure };
