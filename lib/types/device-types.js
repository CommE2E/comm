// @flow

import invariant from 'invariant';
import PropTypes from 'prop-types';

export type DeviceType = 'ios' | 'android';
export type Platform = DeviceType | 'web';

export const platformPropType = PropTypes.oneOf(['ios', 'android', 'web']);

export function isDeviceType(platform: ?string) {
  return platform === 'ios' || platform === 'android';
}

export function assertDeviceType(deviceType: ?string): DeviceType {
  invariant(
    deviceType === 'ios' || deviceType === 'android',
    'string is not DeviceType enum',
  );
  return deviceType;
}

export type DeviceTokenUpdateRequest = {|
  +deviceToken: string,
  +deviceType?: DeviceType,
  +platformDetails?: PlatformDetails,
|};

export type PlatformDetails = {|
  platform: Platform,
  codeVersion?: number,
  stateVersion?: number,
|};

export const platformDetailsPropType = PropTypes.shape({
  platform: platformPropType.isRequired,
  codeVersion: PropTypes.number,
  stateVersion: PropTypes.number,
});
