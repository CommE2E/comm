// @flow

import type { KeyserverStore } from '../types/keyserver-types.js';

function removeCookiesFromKeyserverStore(
  oldStore: KeyserverStore,
): KeyserverStore {
  const keyserverInfos = {
    ...oldStore.keyserverInfos,
  };
  for (const key in keyserverInfos) {
    keyserverInfos[key] = { ...keyserverInfos[key], cookie: null };
  }
  return {
    ...oldStore,
    keyserverInfos,
  };
}

export { removeCookiesFromKeyserverStore };
