// @flow

import type { SessionState } from 'lib/types/session-types.js';
import type { ServerStateSyncSocketPayload } from 'lib/types/socket-types.js';

import { Viewer } from '../session/viewer.js';
import { fetchDataForSocketInit } from '../socket/fetch-data.js';

function fetchPendingUpdatesResponder(
  viewer: Viewer,
  request: SessionState,
): Promise<ServerStateSyncSocketPayload> {
  return fetchDataForSocketInit(viewer, request);
}

export { fetchPendingUpdatesResponder };
