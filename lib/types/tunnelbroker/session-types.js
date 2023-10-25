// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type DeviceTypes = 'Mobile' | 'Web' | 'Keyserver';

export type ConnectionInitializationMessage = {
  +type: 'ConnectionInitializationMessage',
  +deviceID: string,
  +accessToken: string,
  +userID: string,
  +notifyToken?: ?string,
  +deviceType: DeviceTypes,
  +deviceAppVersion?: ?string,
  +deviceOS?: ?string,
};

export const connectionInitializationMessageValidator: TInterface<ConnectionInitializationMessage> =
  tShape<ConnectionInitializationMessage>({
    type: tString('ConnectionInitializationMessage'),
    deviceID: t.String,
    accessToken: t.String,
    userID: t.String,
    notifyToken: t.maybe(t.String),
    deviceType: t.enums.of(['Mobile', 'Web', 'Keyserver']),
    deviceAppVersion: t.maybe(t.String),
    deviceOS: t.maybe(t.String),
  });
