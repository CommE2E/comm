// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString, tUserID } from '../../utils/validation-utils.js';

export const qrCodeAuthMessageTypes = Object.freeze({
  DEVICE_LIST_UPDATE_SUCCESS: 'DeviceListUpdateSuccess',
  SECONDARY_DEVICE_REGISTRATION_SUCCESS: 'SecondaryDeviceRegistrationSuccess',
  BACKUP_DATA_KEY_MESSAGE: 'BackupDataKeyMessage',
});

export type DeviceListUpdateSuccess = {
  +type: 'DeviceListUpdateSuccess',
  +userID: string,
  +primaryDeviceID: string,
};
export const deviceListUpdateSuccessValidator: TInterface<DeviceListUpdateSuccess> =
  tShape<DeviceListUpdateSuccess>({
    type: tString(qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS),
    userID: tUserID,
    primaryDeviceID: t.String,
  });

export type SecondaryDeviceRegistrationSuccess = {
  +type: 'SecondaryDeviceRegistrationSuccess',
};
export const secondaryDeviceRegistrationSuccessValidator: TInterface<SecondaryDeviceRegistrationSuccess> =
  tShape<SecondaryDeviceRegistrationSuccess>({
    type: tString(qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS),
  });

export type BackupDataKeyMessage = {
  +type: 'BackupDataKeyMessage',
  +backupID: string,
  +backupDataKey: string,
  +backupLogDataKey: string,
};
export const backupDataKeyMessageValidator: TInterface<BackupDataKeyMessage> =
  tShape<BackupDataKeyMessage>({
    type: tString(qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE),
    backupID: t.String,
    backupDataKey: t.String,
    backupLogDataKey: t.String,
  });

export type QRCodeAuthMessagePayload =
  | DeviceListUpdateSuccess
  | SecondaryDeviceRegistrationSuccess
  | BackupDataKeyMessage;

export const qrCodeAuthMessagePayloadValidator: TUnion<QRCodeAuthMessagePayload> =
  t.union([
    deviceListUpdateSuccessValidator,
    secondaryDeviceRegistrationSuccessValidator,
    backupDataKeyMessageValidator,
  ]);
