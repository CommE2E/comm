// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';
import { type DMOperation, dmOperationValidator } from '../dm-ops.js';

export const userActionsP2PMessageTypes = Object.freeze({
  LOG_OUT_DEVICE: 'LOG_OUT_DEVICE',
  LOG_OUT_SECONDARY_DEVICE: 'LOG_OUT_SECONDARY_DEVICE',
  ACCOUNT_DELETION: 'ACCOUNT_DELETION',
  DM_OPERATION: 'DM_OPERATION',
});

export type DeviceLogoutP2PMessage = {
  +type: 'LOG_OUT_DEVICE',
};
export const deviceLogoutP2PMessageValidator: TInterface<DeviceLogoutP2PMessage> =
  tShape<DeviceLogoutP2PMessage>({
    type: tString(userActionsP2PMessageTypes.LOG_OUT_DEVICE),
  });

export type SecondaryDeviceLogoutP2PMessage = {
  +type: 'LOG_OUT_SECONDARY_DEVICE',
  // there is `senderID` so we don't have to add deviceID here
};
export const secondaryDeviceLogoutP2PMessageValidator: TInterface<SecondaryDeviceLogoutP2PMessage> =
  tShape<SecondaryDeviceLogoutP2PMessage>({
    type: tString(userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE),
  });

export type AccountDeletionP2PMessage = {
  +type: 'ACCOUNT_DELETION',
};
export const accountDeletionP2PMessageValidator: TInterface<AccountDeletionP2PMessage> =
  tShape<AccountDeletionP2PMessage>({
    type: tString(userActionsP2PMessageTypes.ACCOUNT_DELETION),
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
  | DeviceLogoutP2PMessage
  | SecondaryDeviceLogoutP2PMessage
  | AccountDeletionP2PMessage
  | DMOperationP2PMessage;

export const userActionP2PMessageValidator: TUnion<UserActionP2PMessage> =
  t.union([
    deviceLogoutP2PMessageValidator,
    secondaryDeviceLogoutP2PMessageValidator,
    accountDeletionP2PMessageValidator,
    dmOperationP2PMessageValidator,
  ]);
