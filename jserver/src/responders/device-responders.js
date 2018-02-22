// @flow

import type { $Response, $Request } from 'express';
import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import { tShape } from '../utils/tcomb-utils';

const deviceTokenUpdateRequestInputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  deviceToken: t.String,
});

async function deviceTokenUpdateResponder(
  req: $Request,
  res: $Response,
): Promise<void> {
  const deviceTokenUpdateRequest: DeviceTokenUpdateRequest = (req.body: any);
  if (!deviceTokenUpdateRequestInputValidator.is(deviceTokenUpdateRequest)) {
    throw new ServerError('invalid_parameters');
  }
  await deviceTokenUpdater(deviceTokenUpdateRequest);
}

export {
  deviceTokenUpdateResponder,
};
