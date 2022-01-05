// @flow

import invariant from 'invariant';
import t, { type TInterface, type TEnums } from 'tcomb';

import { tShape } from '../utils/validation-utils';
export type DeviceType = 'ios' | 'android';
export type Platform = DeviceType | 'web';
export const platformValidator: TEnums = t.enums.of(['ios', 'android', 'web']);

export function isDeviceType(platform: ?string): boolean {
  return platform === 'ios' || platform === 'android';
}

export function assertDeviceType(deviceType: ?string): DeviceType {
  invariant(
    deviceType === 'ios' || deviceType === 'android',
    'string is not DeviceType enum',
  );
  return deviceType;
}

export type DeviceTokenUpdateRequest = {
  +deviceToken: string,
  +deviceType?: DeviceType,
  +platformDetails?: PlatformDetails,
};

export type PlatformDetails = {
  +platform: Platform,
  +codeVersion?: number,
  +stateVersion?: number,
};
export const platformDetailsValidator: TInterface = tShape({
  platform: platformValidator,
  codeVersion: t.maybe(t.Number),
  stateVersion: t.maybe(t.Number),
});
