// @flow

import type { TInterface } from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export const userActionsP2PMessageTypes = Object.freeze({
  LOG_OUT_SECONDARY_DEVICE: 'LOG_OUT_SECONDARY_DEVICE',
});

export type SecondaryDeviceLogoutP2PMessage = {
  +type: 'LOG_OUT_SECONDARY_DEVICE',
  // there is `senderID` so we don't have to add deviceID here
};
export const secondaryDeviceLogoutP2PMessageValidator: TInterface<SecondaryDeviceLogoutP2PMessage> =
  tShape<SecondaryDeviceLogoutP2PMessage>({
    type: tString(userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE),
  });

export type UserActionP2PMessage = SecondaryDeviceLogoutP2PMessage;

export const userActionP2PMessageValidator: TInterface<UserActionP2PMessage> =
  secondaryDeviceLogoutP2PMessageValidator;
