// @flow

import type { DeviceType } from './device-types.js';

export type CreateNewVersionsRequest = {
  +codeVersion: number,
  +deviceType: DeviceType,
};
