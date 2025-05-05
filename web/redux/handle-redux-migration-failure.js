// @flow

import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import { defaultWebState } from './default-state.js';
import { nonUserSpecificFieldsWeb, type AppState } from './redux-setup.js';

const persistWhitelist = [
  'enabledApps',
  'alertStore',
  'commServicesAccessToken',
  'globalThemeInfo',
  'customServer',
  'messageStore',
  'tunnelbrokerDeviceToken',
  'queuedDMOperations',
  'holderStore',
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
