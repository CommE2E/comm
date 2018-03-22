// @flow

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import { validateInput, tShape } from '../utils/validation-utils';

const deviceTokenUpdateRequestInputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  deviceToken: t.String,
});

async function deviceTokenUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: DeviceTokenUpdateRequest = input;
  validateInput(deviceTokenUpdateRequestInputValidator, request);
  await deviceTokenUpdater(viewer, request);
}

export {
  deviceTokenUpdateRequestInputValidator,
  deviceTokenUpdateResponder,
};
