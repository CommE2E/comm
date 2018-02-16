// @flow

import type { $Response, $Request } from 'express';
import type { DeviceTokenUpdate } from 'lib/types/device-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { deviceTokenUpdater } from '../updaters/device-token-updater';
import { tShape } from '../utils/tcomb-utils';

const inputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  deviceToken: t.String,
});

async function deviceTokenUpdateResponder(req: $Request, res: $Response) {
  const deviceTokenUpdate: DeviceTokenUpdate = (req.body: any);
  if (!inputValidator.is(deviceTokenUpdate)) {
    throw new ServerError('invalid_parameters');
  }
  await deviceTokenUpdater(deviceTokenUpdate);
}

export {
  deviceTokenUpdateResponder,
};
