// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types.js';
import { tShape, tPlatformDetails } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { deviceTokenUpdater } from '../updaters/device-token-updaters.js';

const deviceTokenUpdateRequestInputValidator: TInterface<DeviceTokenUpdateRequest> =
  tShape<DeviceTokenUpdateRequest>({
    deviceToken: t.maybe(t.String),
    deviceType: t.maybe(t.enums.of(['ios', 'android'])),
    platformDetails: t.maybe(tPlatformDetails),
  });

async function deviceTokenUpdateResponder(
  viewer: Viewer,
  request: DeviceTokenUpdateRequest,
): Promise<void> {
  await deviceTokenUpdater(viewer, request);
}

export { deviceTokenUpdateRequestInputValidator, deviceTokenUpdateResponder };
