// @flow

import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { permissionsAndAuthRelatedRequestTimeout } from '../shared/timeouts.js';
import type { FetchPendingUpdatesInput } from '../types/session-types.js';
import type { ClientStateSyncSocketResult } from '../types/socket-types.js';

const fetchPendingUpdatesActionTypes = Object.freeze({
  started: 'FETCH_PENDING_UPDATES_STARTED',
  success: 'FETCH_PENDING_UPDATES_SUCCESS',
  failed: 'FETCH_PENDING_UPDATES_FAILED',
});
const fetchPendingUpdatesCallKeyserverEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const fetchPendingUpdates =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: FetchPendingUpdatesInput,
  ) => Promise<ClientStateSyncSocketResult>) =>
  async input => {
    const { keyserverID, ...sessionState } = input;
    const requests = { [keyserverID]: sessionState };
    const responses = await callKeyserverEndpoint(
      'fetch_pending_updates',
      requests,
      fetchPendingUpdatesCallKeyserverEndpointOptions,
    );
    return { keyserverID, ...responses[keyserverID] };
  };

function useFetchPendingUpdates(): (
  input: FetchPendingUpdatesInput,
) => Promise<ClientStateSyncSocketResult> {
  return useKeyserverCall(fetchPendingUpdates);
}

export { fetchPendingUpdatesActionTypes, useFetchPendingUpdates };
