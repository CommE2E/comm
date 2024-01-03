// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tNumber, tShape, tString } from '../../utils/validation-utils.js';

export type SenderInfo = {
  +userID: string,
  +deviceID: string,
};
const senderInfoValidator: TInterface<SenderInfo> = tShape<SenderInfo>({
  userID: t.String,
  deviceID: t.String,
});

export const peerToPeerMessageTypes = Object.freeze({
  OUTBOUND_SESSION_CREATION: 0,
  ENCRYPTED_MESSAGE: 1,
  REFRESH_KEY_REQUEST: 'RefreshKeyRequest',
});

export type OutboundSessionCreation = {
  +type: 0,
  +senderInfo: SenderInfo,
  +encryptedContent: string,
};
export const outboundSessionCreationValidator: TInterface<OutboundSessionCreation> =
  tShape<OutboundSessionCreation>({
    type: tNumber(peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION),
    senderInfo: senderInfoValidator,
    encryptedContent: t.String,
  });

export type EncryptedMessage = {
  +type: 1,
  +senderInfo: SenderInfo,
  +encryptedContent: string,
};
export const encryptedMessageValidator: TInterface<EncryptedMessage> =
  tShape<EncryptedMessage>({
    type: tNumber(peerToPeerMessageTypes.ENCRYPTED_MESSAGE),
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
    type: tString('RefreshKeyRequest'),
    deviceID: t.String,
    numberOfKeys: t.Number,
  });

export type PeerToPeerMessage =
  | OutboundSessionCreation
  | EncryptedMessage
  | RefreshKeyRequest;

export const peerToPeerMessageValidator: TUnion<PeerToPeerMessage> = t.union([
  outboundSessionCreationValidator,
  encryptedMessageValidator,
  refreshKeysRequestValidator,
]);
