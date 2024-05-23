// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString, tUserID } from '../../utils/validation-utils.js';
import { type EncryptedData, encryptedDataValidator } from '../crypto-types.js';
import {
  signedDeviceListValidator,
  type SignedDeviceList,
} from '../identity-service-types.js';

export type SenderInfo = {
  +userID: string,
  +deviceID: string,
};
const senderInfoValidator: TInterface<SenderInfo> = tShape<SenderInfo>({
  userID: tUserID,
  deviceID: t.String,
});

export const peerToPeerMessageTypes = Object.freeze({
  OUTBOUND_SESSION_CREATION: 'OutboundSessionCreation',
  ENCRYPTED_MESSAGE: 'EncryptedMessage',
  REFRESH_KEY_REQUEST: 'RefreshKeyRequest',
  QR_CODE_AUTH_MESSAGE: 'QRCodeAuthMessage',
  DEVICE_LIST_UPDATED: 'DeviceListUpdated',
  MESSAGE_PROCESSED: 'MessageProcessed',
});

export type OutboundSessionCreation = {
  +type: 'OutboundSessionCreation',
  +senderInfo: SenderInfo,
  +encryptedData: EncryptedData,
  +sessionVersion: number,
};
export const outboundSessionCreationValidator: TInterface<OutboundSessionCreation> =
  tShape<OutboundSessionCreation>({
    type: tString(peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION),
    senderInfo: senderInfoValidator,
    encryptedData: encryptedDataValidator,
    sessionVersion: t.Number,
  });

export type EncryptedMessage = {
  +type: 'EncryptedMessage',
  +senderInfo: SenderInfo,
  +encryptedData: EncryptedData,
};
export const encryptedMessageValidator: TInterface<EncryptedMessage> =
  tShape<EncryptedMessage>({
    type: tString(peerToPeerMessageTypes.ENCRYPTED_MESSAGE),
    senderInfo: senderInfoValidator,
    encryptedData: encryptedDataValidator,
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
    userID: tUserID,
    signedDeviceList: signedDeviceListValidator,
  });

export type MessageProcessed = {
  +type: 'MessageProcessed',
  +messageID: string,
  +deviceID: string,
};
export const messageProcessedValidator: TInterface<MessageProcessed> =
  tShape<MessageProcessed>({
    type: tString(peerToPeerMessageTypes.MESSAGE_PROCESSED),
    messageID: t.String,
    deviceID: t.String,
  });

export type PeerToPeerMessage =
  | OutboundSessionCreation
  | EncryptedMessage
  | RefreshKeyRequest
  | QRCodeAuthMessage
  | DeviceListUpdated
  | MessageProcessed;

export const peerToPeerMessageValidator: TUnion<PeerToPeerMessage> = t.union([
  outboundSessionCreationValidator,
  encryptedMessageValidator,
  refreshKeysRequestValidator,
  qrCodeAuthMessageValidator,
  deviceListUpdatedValidator,
  messageProcessedValidator,
]);
