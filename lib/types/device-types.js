// @flow

import invariant from 'invariant';

export type DeviceType = "ios" | "android";
export type Platform = DeviceType | "web";

export function assertDeviceType(
  deviceType: string,
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
