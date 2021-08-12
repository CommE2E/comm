// @flow

import type { DeviceType } from './device-types';

export type CreateNewVersionsRequest = {
  +codeVersion: number,
  +deviceType: DeviceType,
};
