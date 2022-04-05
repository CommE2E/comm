// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';
import { tShape, tPlatformDetails } from 'lib/utils/validation-utils';

import type { Viewer } from '../session/viewer';
import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import { validateInput } from '../utils/validation-utils';

const deviceTokenUpdateRequestInputValidator: TInterface = tShape({
  deviceToken: t.String,
  deviceType: t.maybe(t.enums.of(['ios', 'android'])),
  platformDetails: t.maybe(tPlatformDetails),
});

async function deviceTokenUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: DeviceTokenUpdateRequest = input;
  await validateInput(viewer, deviceTokenUpdateRequestInputValidator, request);
  await deviceTokenUpdater(viewer, request);
}

export { deviceTokenUpdateRequestInputValidator, deviceTokenUpdateResponder };
