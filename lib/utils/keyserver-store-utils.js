// @flow

import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import type { KeyserverStore } from '../types/keyserver-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';

function wipeKeyserverStore(oldStore: KeyserverStore): KeyserverStore {
  const keyserverInfos = {
    [authoritativeKeyserverID()]: defaultKeyserverInfo(
      oldStore.keyserverInfos[authoritativeKeyserverID()].urlPrefix,
    ),
  };
  return {
    ...oldStore,
    keyserverInfos,
  };
}

export { wipeKeyserverStore };
