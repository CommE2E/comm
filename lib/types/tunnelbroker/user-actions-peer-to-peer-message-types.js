// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import type { QRAuthBackupData } from './qr-code-auth-message-types.js';
import { qrAuthBackupDataValidator } from './qr-code-auth-message-types.js';
import { tShape, tString, tUserID } from '../../utils/validation-utils.js';
import { type DMOperation, dmOperationValidator } from '../dm-ops.js';

export const userActionsP2PMessageTypes = Object.freeze({
  LOG_OUT_DEVICE: 'LOG_OUT_DEVICE',
  LOG_OUT_SECONDARY_DEVICE: 'LOG_OUT_SECONDARY_DEVICE',
  ACCOUNT_DELETION: 'ACCOUNT_DELETION',
  DM_OPERATION: 'DM_OPERATION',
  BACKUP_DATA: 'BACKUP_DATA',
  FARCASTER_CONNECTION_UPDATED: 'FARCASTER_CONNECTION_UPDATED',
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

// Used when the primary wants to send backup keys after uploading the backup
// for the first time
export type BackupDataP2PMessage = {
  +type: 'BACKUP_DATA',
  +userID: string,
  +primaryDeviceID: string,
  +backupData: QRAuthBackupData,
};
export const backupDataP2PMessageValidator: TInterface<BackupDataP2PMessage> =
  tShape<BackupDataP2PMessage>({
    type: tString(userActionsP2PMessageTypes.BACKUP_DATA),
    userID: tUserID,
    primaryDeviceID: t.String,
    backupData: t.maybe(qrAuthBackupDataValidator),
  });

export type FarcasterConnectionUpdated = {
  +type: 'FARCASTER_CONNECTION_UPDATED',
  +farcasterID: ?string,
  +hasDCsToken: ?boolean,
};
export const farcasterConnectionUpdatedValidator: TInterface<FarcasterConnectionUpdated> =
  tShape<FarcasterConnectionUpdated>({
    type: tString(userActionsP2PMessageTypes.FARCASTER_CONNECTION_UPDATED),
    farcasterID: t.maybe(t.String),
    hasDCsToken: t.maybe(t.Boolean),
  });

export type UserActionP2PMessage =
  | DeviceLogoutP2PMessage
  | SecondaryDeviceLogoutP2PMessage
  | AccountDeletionP2PMessage
  | DMOperationP2PMessage
  | BackupDataP2PMessage
  | FarcasterConnectionUpdated;

export const userActionP2PMessageValidator: TUnion<UserActionP2PMessage> =
  t.union([
    deviceLogoutP2PMessageValidator,
    secondaryDeviceLogoutP2PMessageValidator,
    accountDeletionP2PMessageValidator,
    dmOperationP2PMessageValidator,
    backupDataP2PMessageValidator,
    farcasterConnectionUpdatedValidator,
  ]);
