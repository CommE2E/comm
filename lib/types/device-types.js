// @flow

export type DeviceType = "ios" | "android";
export type Platform = DeviceType | "web";

export type DeviceTokenUpdateRequest = {|
  deviceType: DeviceType,
  deviceToken: string,
|};

export type DeviceTokens = {|
  ios?: ?string,
  android?: ?string,
|};
