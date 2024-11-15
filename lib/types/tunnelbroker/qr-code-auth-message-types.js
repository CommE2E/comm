// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString, tUserID } from '../../utils/validation-utils.js';

export const qrCodeAuthMessageTypes = Object.freeze({
  // sent by primary device
  DEVICE_LIST_UPDATE_SUCCESS: 'DeviceListUpdateSuccess',
  // sent by secondary device
  SECONDARY_DEVICE_REGISTRATION_SUCCESS: 'SecondaryDeviceRegistrationSuccess',
});

type QRAuthBackupData = {
  +backupID: string,
  +backupDataKey: string,
  +backupLogDataKey: string,
};
export const qrAuthBackupDataValidator: TInterface<QRAuthBackupData> =
  tShape<QRAuthBackupData>({
    backupID: t.String,
    backupDataKey: t.String,
    backupLogDataKey: t.String,
  });

export type DeviceListUpdateSuccess = {
  +type: 'DeviceListUpdateSuccess',
  +userID: string,
  +primaryDeviceID: string,
  // We don't need `backupData` for the keyserver
  +backupData: ?QRAuthBackupData,
};
export const deviceListUpdateSuccessValidator: TInterface<DeviceListUpdateSuccess> =
  tShape<DeviceListUpdateSuccess>({
    type: tString(qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS),
    userID: tUserID,
    primaryDeviceID: t.String,
    backupData: t.maybe(qrAuthBackupDataValidator),
  });

export type SecondaryDeviceRegistrationSuccess = {
  +type: 'SecondaryDeviceRegistrationSuccess',
  +requestBackupKeys: boolean,
};
export const secondaryDeviceRegistrationSuccessValidator: TInterface<SecondaryDeviceRegistrationSuccess> =
  tShape<SecondaryDeviceRegistrationSuccess>({
    type: tString(qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS),
    requestBackupKeys: t.Boolean,
  });

export type QRCodeAuthMessagePayload =
  | DeviceListUpdateSuccess
  | SecondaryDeviceRegistrationSuccess;

export const qrCodeAuthMessagePayloadValidator: TUnion<QRCodeAuthMessagePayload> =
  t.union([
    deviceListUpdateSuccessValidator,
    secondaryDeviceRegistrationSuccessValidator,
  ]);
