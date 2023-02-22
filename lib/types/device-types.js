// @flow

import invariant from 'invariant';

export type DeviceType = 'ios' | 'android';
export type Platform = DeviceType | 'web' | 'windows' | 'macos';

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

export function isWebPlatform(platform: ?string): boolean {
  return platform === 'web' || platform === 'windows' || platform === 'macos';
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
