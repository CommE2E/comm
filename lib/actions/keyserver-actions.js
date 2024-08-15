// @flow

import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type { RecreateNotifsOlmSessionRequest } from '../types/keyserver-types.js';

const addKeyserverActionType = 'ADD_KEYSERVER';

const removeKeyserverActionType = 'REMOVE_KEYSERVER';

const recreateNotifsOlmSession =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: $ReadOnly<{
      ...RecreateNotifsOlmSessionRequest,
      keyserverID: string,
    }>,
  ) => Promise<void>) =>
  async input => {
    const { keyserverID, ...request } = input;
    const requests = { [keyserverID]: request };
    await callKeyserverEndpoint('recreate_notifs_olm_session', requests);
  };

function useRecreateNotifsOlmSession(): (
  input: $ReadOnly<{
    ...RecreateNotifsOlmSessionRequest,
    keyserverID: string,
  }>,
) => Promise<void> {
  return useKeyserverCall(recreateNotifsOlmSession);
}

export {
  addKeyserverActionType,
  removeKeyserverActionType,
  useRecreateNotifsOlmSession,
};
