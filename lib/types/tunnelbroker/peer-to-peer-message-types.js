// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';
import {
  signedDeviceListValidator,
  type SignedDeviceList,
} from '../identity-service-types.js';

export type SenderInfo = {
  +userID: string,
  +deviceID: string,
};
const senderInfoValidator: TInterface<SenderInfo> = tShape<SenderInfo>({
  userID: t.String,
  deviceID: t.String,
});

export const peerToPeerMessageTypes = Object.freeze({
  OUTBOUND_SESSION_CREATION: 'OutboundSessionCreation',
  ENCRYPTED_MESSAGE: 'EncryptedMessage',
  REFRESH_KEY_REQUEST: 'RefreshKeyRequest',
  QR_CODE_AUTH_MESSAGE: 'QRCodeAuthMessage',
  DEVICE_LIST_UPDATED: 'DeviceListUpdated',
});

export type OutboundSessionCreation = {
  +type: 'OutboundSessionCreation',
  +senderInfo: SenderInfo,
  +encryptedContent: string,
};
export const outboundSessionCreationValidator: TInterface<OutboundSessionCreation> =
  tShape<OutboundSessionCreation>({
    type: tString(peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION),
    senderInfo: senderInfoValidator,
    encryptedContent: t.String,
  });

export type EncryptedMessage = {
  +type: 'EncryptedMessage',
  +senderInfo: SenderInfo,
  +encryptedContent: string,
};
export const encryptedMessageValidator: TInterface<EncryptedMessage> =
  tShape<EncryptedMessage>({
    type: tString(peerToPeerMessageTypes.ENCRYPTED_MESSAGE),
    senderInfo: senderInfoValidator,
    encryptedContent: t.String,
  });

export type RefreshKeyRequest = {
  +type: 'RefreshKeyRequest',
  +deviceID: string,
  +numberOfKeys: number,
};
export const refreshKeysRequestValidator: TInterface<RefreshKeyRequest> =
  tShape<RefreshKeyRequest>({
    type: tString(peerToPeerMessageTypes.REFRESH_KEY_REQUEST),
    deviceID: t.String,
    numberOfKeys: t.Number,
  });

export type QRCodeAuthMessage = {
  +type: 'QRCodeAuthMessage',
  +encryptedContent: string,
};
export const qrCodeAuthMessageValidator: TInterface<QRCodeAuthMessage> =
  tShape<QRCodeAuthMessage>({
    type: tString(peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE),
    encryptedContent: t.String,
  });

export type DeviceListUpdated = {
  +type: 'DeviceListUpdated',
  +userID: string,
  +signedDeviceList: SignedDeviceList,
};
export const deviceListUpdatedValidator: TInterface<DeviceListUpdated> =
  tShape<DeviceListUpdated>({
    type: tString(peerToPeerMessageTypes.DEVICE_LIST_UPDATED),
    userID: t.String,
    signedDeviceList: signedDeviceListValidator,
  });

export type PeerToPeerMessage =
  | OutboundSessionCreation
  | EncryptedMessage
  | RefreshKeyRequest
  | QRCodeAuthMessage
  | DeviceListUpdated;

export const peerToPeerMessageValidator: TUnion<PeerToPeerMessage> = t.union([
  outboundSessionCreationValidator,
  encryptedMessageValidator,
  refreshKeysRequestValidator,
  qrCodeAuthMessageValidator,
  deviceListUpdatedValidator,
]);
