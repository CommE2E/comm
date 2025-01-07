// @flow

import type { LegacyLogInExtraInfo } from './account-types.js';
import type { SignedIdentityKeysBlob } from './crypto-types.js';
import {
  type DeviceTokenUpdateRequest,
  type PlatformDetails,
} from './device-types.js';
import { type CalendarQuery } from './entry-types.js';

export type SIWENonceResponse = {
  +nonce: string,
};

export type SIWEAuthRequest = {
  +message: string,
  +signature: string,
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +watchedIDs: $ReadOnlyArray<string>,
  +signedIdentityKeysBlob?: ?SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
  +doNotRegister?: boolean,
};

export type LegacySIWEAuthServerCall = {
  +message: string,
  +signature: string,
  +doNotRegister?: boolean,
  ...LegacyLogInExtraInfo,
};

export type SIWESocialProof = {
  +siweMessage: string,
  +siweMessageSignature: string,
};

// This is a message that the rendered webpage (landing/siwe.react.js) uses to
// communicate back to the React Native WebView that is rendering it
// (native/account/siwe-panel.react.js)
export type SIWEWebViewMessage =
  | {
      +type: 'siwe_success',
      +address: string,
      +message: string,
      +signature: string,
    }
  | {
      +type: 'siwe_closed',
    }
  | {
      +type: 'walletconnect_modal_update',
      +state: 'open',
      +height: number,
    }
  | {
      +type: 'walletconnect_modal_update',
      +state: 'closed',
    };

export type SIWEMessage = {
  // RFC 4501 dns authority that is requesting the signing.
  +domain: string,

  // Ethereum address performing the signing conformant to capitalization
  // encoded checksum specified in EIP-55 where applicable.
  +address: string,

  // Human-readable ASCII assertion that the user will sign, and it must not
  // contain `\n`.
  +statement?: string,

  // RFC 3986 URI referring to the resource that is the subject of the signing
  //  (as in the __subject__ of a claim).
  +uri: string,

  // Current version of the message.
  +version: string,

  // EIP-155 Chain ID to which the session is bound, and the network where
  // Contract Accounts must be resolved.
  +chainId: number,

  // Randomized token used to prevent replay attacks, at least 8 alphanumeric
  // characters.
  +nonce: string,

  // ISO 8601 datetime string of the current time.
  +issuedAt: string,

  // ISO 8601 datetime string that, if present, indicates when the signed
  // authentication message is no longer valid.
  +expirationTime?: string,

  // ISO 8601 datetime string that, if present, indicates when the signed
  // authentication message will become valid.
  +notBefore?: string,

  // System-specific identifier that may be used to uniquely refer to the
  // sign-in request.
  +requestId?: string,

  // List of information or references to information the user wishes to have
  // resolved as part of authentication by the relying party. They are
  // expressed as RFC 3986 URIs separated by `\n- `.
  +resources?: $ReadOnlyArray<string>,

  // @deprecated
  // Signature of the message signed by the wallet.
  //
  // This field will be removed in future releases, an additional parameter
  // was added to the validate function were the signature goes to validate
  // the message.
  +signature?: string,

  // @deprecated
  // Type of sign message to be generated.
  //
  // This field will be removed in future releases and will rely on the
  // message version.
  +type?: 'Personal signature',
  +verify: ({ +signature: string, ... }) => Promise<mixed>,
  +toMessage: () => string,
};

export type SIWEResult = {
  +address: string,
  +message: string,
  +signature: string,
  +nonceTimestamp: ?number,
};

export type IdentityWalletRegisterInput = {
  +address: string,
  +message: string,
  +signature: string,
  +fid?: ?string,
};

export const SIWEMessageTypes = Object.freeze({
  MSG_AUTH: 'msg_auth',
  MSG_BACKUP: 'msg_backup',
  MSG_BACKUP_RESTORE: 'msg_backup_restore',
});

export type SIWEMessageType = $Values<typeof SIWEMessageTypes>;

export type SIWESignatureRequestData =
  | { +messageType: 'msg_auth' | 'msg_backup' }
  | {
      +messageType: 'msg_backup_restore',
      +siweNonce: string,
      +siweStatement: string,
      +siweIssuedAt: string,
    };

export type SIWEBackupSecrets = {
  +message: string,
  +signature: string,
};

export const legacyKeyserverSIWENonceLifetime = 30 * 60 * 1000; // 30 minutes
export const identitySIWENonceLifetime = 2 * 60 * 1000; // 2 minutes
