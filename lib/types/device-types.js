// @flow

export type DeviceType = "ios" | "android";

export type DeviceTokenUpdate = {|
  deviceType: DeviceType,
  deviceToken: string,
|};
