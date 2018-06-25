// @flow

import invariant from 'invariant';

export type DeviceType = "ios" | "android";
export type Platform = DeviceType | "web";

export function isDeviceType(platform: ?string) {
  return platform === "ios" || platform === "android";
}

export function assertDeviceType(
  deviceType: ?string,
): DeviceType {
  invariant(
    deviceType === "ios" || deviceType === "android",
    "string is not DeviceType enum",
  );
  return deviceType;
}

export type DeviceTokenUpdateRequest = {|
  deviceType: DeviceType,
  deviceToken: string,
|};

export type PlatformDetails = {|
  platform: Platform,
  codeVersion?: number,
  stateVersion?: number,
|};
