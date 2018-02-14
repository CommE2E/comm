// @flow

import type { $Response, $Request } from 'express';
import type { DeviceTokenUpdate } from 'lib/types/device-types';

import t from 'tcomb';

import { deviceTokenUpdater } from '../updaters/device-token-updater';
import { setCurrentViewerFromCookie } from '../session/cookies';
import { tShape } from '../utils/tcomb-utils';

const inputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  deviceToken: t.String,
});

async function deviceTokenUpdateResponder(req: $Request, res: $Response) {
  const deviceTokenUpdate: DeviceTokenUpdate = (req.body: any);
  if (!inputValidator.is(deviceTokenUpdate)) {
    return { error: 'invalid_parameters' };
  }
  await setCurrentViewerFromCookie(req.cookies);
  await deviceTokenUpdater(deviceTokenUpdate);
  return { success: true };
}

export {
  deviceTokenUpdateResponder,
};
