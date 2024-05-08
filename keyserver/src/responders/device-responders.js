// @flow

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types.js';

import type { Viewer } from '../session/viewer.js';
import { deviceTokenUpdater } from '../updaters/device-token-updaters.js';

async function deviceTokenUpdateResponder(
  viewer: Viewer,
  request: DeviceTokenUpdateRequest,
): Promise<void> {
  await deviceTokenUpdater(viewer, request);
}

export { deviceTokenUpdateResponder };
