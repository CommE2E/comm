// @flow
import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tShape, tPlatformDetails } from '../../utils/validation-utils.js';
import type { DeviceTokenUpdateRequest } from '../device-types.js';

export const deviceTokenUpdateRequestInputValidator: TInterface<DeviceTokenUpdateRequest> =
  tShape<DeviceTokenUpdateRequest>({
    deviceToken: t.maybe(t.String),
    deviceType: t.maybe(t.enums.of(['ios', 'android'])),
    platformDetails: t.maybe(tPlatformDetails),
  });
