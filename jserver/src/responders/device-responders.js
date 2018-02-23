// @flow

import type { $Response, $Request } from 'express';
import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import { tShape } from '../utils/tcomb-utils';

const deviceTokenUpdateRequestInputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  deviceToken: t.String,
});

async function deviceTokenUpdateResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  const deviceTokenUpdateRequest: DeviceTokenUpdateRequest = (req.body: any);
  if (!deviceTokenUpdateRequestInputValidator.is(deviceTokenUpdateRequest)) {
    throw new ServerError('invalid_parameters');
  }
  await deviceTokenUpdater(viewer, deviceTokenUpdateRequest);
}

export {
  deviceTokenUpdateResponder,
};
