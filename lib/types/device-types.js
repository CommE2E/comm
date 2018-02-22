// @flow

export type DeviceType = "ios" | "android";

export type DeviceTokenUpdateRequest = {|
  deviceType: DeviceType,
  deviceToken: string,
|};
