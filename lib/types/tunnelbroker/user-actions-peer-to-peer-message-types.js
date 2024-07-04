// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';
import { type DMOperation, dmOperationValidator } from '../dm-ops.js';

export const userActionsP2PMessageTypes = Object.freeze({
  LOG_OUT_PRIMARY_DEVICE: 'LOG_OUT_PRIMARY_DEVICE',
  LOG_OUT_SECONDARY_DEVICE: 'LOG_OUT_SECONDARY_DEVICE',
  DM_OPERATION: 'DM_OPERATION',
});

export type PrimaryDeviceLogoutP2PMessage = {
  +type: 'LOG_OUT_PRIMARY_DEVICE',
};
export const primaryDeviceLogoutP2PMessageValidator: TInterface<PrimaryDeviceLogoutP2PMessage> =
  tShape<PrimaryDeviceLogoutP2PMessage>({
    type: tString(userActionsP2PMessageTypes.LOG_OUT_PRIMARY_DEVICE),
  });

export type SecondaryDeviceLogoutP2PMessage = {
  +type: 'LOG_OUT_SECONDARY_DEVICE',
  // there is `senderID` so we don't have to add deviceID here
};
export const secondaryDeviceLogoutP2PMessageValidator: TInterface<SecondaryDeviceLogoutP2PMessage> =
  tShape<SecondaryDeviceLogoutP2PMessage>({
    type: tString(userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE),
  });

export type DMOperationP2PMessage = {
  +type: 'DM_OPERATION',
  +op: DMOperation,
};
export const dmOperationP2PMessageValidator: TInterface<DMOperationP2PMessage> =
  tShape<DMOperationP2PMessage>({
    type: tString(userActionsP2PMessageTypes.DM_OPERATION),
    op: dmOperationValidator,
  });

export type UserActionP2PMessage =
  | PrimaryDeviceLogoutP2PMessage
  | SecondaryDeviceLogoutP2PMessage
  | DMOperationP2PMessage;

export const userActionP2PMessageValidator: TUnion<UserActionP2PMessage> =
  t.union([
    primaryDeviceLogoutP2PMessageValidator,
    secondaryDeviceLogoutP2PMessageValidator,
    dmOperationP2PMessageValidator,
  ]);
