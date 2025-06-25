// @flow

import t, { type TInterface, type TEnums } from 'tcomb';

import type { OlmSessionInitializationInfo } from './olm-session-types.js';
import { type AuthMetadata } from '../shared/identity-client-context.js';
import { values } from '../utils/objects.js';
import { tShape } from '../utils/validation-utils.js';

export type OLMIdentityKeys = {
  +ed25519: string,
  +curve25519: string,
};
const olmIdentityKeysValidator: TInterface<OLMIdentityKeys> =
  tShape<OLMIdentityKeys>({
    ed25519: t.String,
    curve25519: t.String,
  });

export type OLMPrekey = {
  +curve25519: {
    +[key: string]: string,
  },
};

export type SignedPrekeys = {
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
};

export const signedPrekeysValidator: TInterface<SignedPrekeys> =
  tShape<SignedPrekeys>({
    contentPrekey: t.String,
    contentPrekeySignature: t.String,
    notifPrekey: t.String,
    notifPrekeySignature: t.String,
  });

export type OLMOneTimeKeys = {
  +curve25519: { +[string]: string },
};

export type OneTimeKeysResult = {
  +contentOneTimeKeys: OLMOneTimeKeys,
  +notificationsOneTimeKeys: OLMOneTimeKeys,
};

export type OneTimeKeysResultValues = {
  +contentOneTimeKeys: $ReadOnlyArray<string>,
  +notificationsOneTimeKeys: $ReadOnlyArray<string>,
};

export type PickledOLMAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

export type NotificationsOlmDataType = {
  +mainSession: string,
  +picklingKey: string,
  +pendingSessionUpdate: string,
  +updateCreationTimestamp: number,
};

export type IdentityKeysBlob = {
  +primaryIdentityPublicKeys: OLMIdentityKeys,
  +notificationIdentityPublicKeys: OLMIdentityKeys,
};
export const identityKeysBlobValidator: TInterface<IdentityKeysBlob> =
  tShape<IdentityKeysBlob>({
    primaryIdentityPublicKeys: olmIdentityKeysValidator,
    notificationIdentityPublicKeys: olmIdentityKeysValidator,
  });

export type SignedIdentityKeysBlob = {
  +payload: string,
  +signature: string,
};
export const signedIdentityKeysBlobValidator: TInterface<SignedIdentityKeysBlob> =
  tShape<SignedIdentityKeysBlob>({
    payload: t.String,
    signature: t.String,
  });

export type UserDetail = {
  +username: string,
  +userID: string,
};

// This type should not be changed without making equivalent changes to
// `Message` in Identity service's `reserved_users` module
export type ReservedUsernameMessage =
  | {
      +statement: 'Add the following usernames to reserved list',
      +payload: $ReadOnlyArray<UserDetail>,
      +issuedAt: string,
    }
  | {
      +statement: 'Remove the following username from reserved list',
      +payload: string,
      +issuedAt: string,
    }
  | {
      +statement: 'This user is the owner of the following username and user ID',
      +payload: UserDetail,
      +issuedAt: string,
    };

export const olmEncryptedMessageTypes = Object.freeze({
  PREKEY: 0,
  TEXT: 1,
});

export type OlmEncryptedMessageTypes = $Values<typeof olmEncryptedMessageTypes>;

export const olmEncryptedMessageTypesValidator: TEnums = t.enums.of(
  values(olmEncryptedMessageTypes),
);

export type EncryptedData = {
  +message: string,
  +messageType: OlmEncryptedMessageTypes,
  +sessionVersion?: number,
};
export const encryptedDataValidator: TInterface<EncryptedData> =
  tShape<EncryptedData>({
    message: t.String,
    messageType: olmEncryptedMessageTypesValidator,
    sessionVersion: t.maybe(t.Number),
  });

export type ClientPublicKeys = {
  +primaryIdentityPublicKeys: {
    +ed25519: string,
    +curve25519: string,
  },
  +notificationIdentityPublicKeys: {
    +ed25519: string,
    +curve25519: string,
  },
  +blobPayload: string,
  +signature: string,
};

export type OutboundSessionCreationResult = {
  +encryptedData: EncryptedData,
  +sessionVersion: number,
};

export type OlmAPI = {
  +initializeCryptoAccount: () => Promise<void>,
  +getUserPublicKey: () => Promise<ClientPublicKeys>,
  +encrypt: (content: string, deviceID: string) => Promise<EncryptedData>,
  +encryptAndPersist: (
    content: string,
    deviceID: string,
    messageID: string,
  ) => Promise<EncryptedData>,
  +encryptNotification: (
    payload: string,
    deviceID: string,
  ) => Promise<EncryptedData>,
  +decrypt: (encryptedData: EncryptedData, deviceID: string) => Promise<string>,
  +decryptAndPersist: (
    encryptedData: EncryptedData,
    deviceID: string,
    userID: string,
    messageID: string,
  ) => Promise<string>,
  +contentInboundSessionCreator: (
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedData: EncryptedData,
    sessionVersion: number,
    overwrite: boolean,
  ) => Promise<string>,
  +contentOutboundSessionCreator: (
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ) => Promise<OutboundSessionCreationResult>,
  +isContentSessionInitialized: (deviceID: string) => Promise<boolean>,
  +keyserverNotificationsSessionCreator: (
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ) => Promise<string>,
  +notificationsOutboundSessionCreator: (
    deviceID: string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
  ) => Promise<EncryptedData>,
  +isDeviceNotificationsSessionInitialized: (
    deviceID: string,
  ) => Promise<boolean>,
  +isNotificationsSessionInitializedWithDevices: (
    deviceIDs: $ReadOnlyArray<string>,
  ) => Promise<{ +[deviceID: string]: boolean }>,
  +reassignNotificationsSession?: (
    prevCookie: ?string,
    newCookie: ?string,
    keyserverID: string,
  ) => Promise<void>,
  +getOneTimeKeys: (numberOfKeys: number) => Promise<OneTimeKeysResultValues>,
  +validateAndUploadPrekeys: (authMetadata: AuthMetadata) => Promise<void>,
  +signMessage: (message: string) => Promise<string>,
  +verifyMessage: (
    message: string,
    signature: string,
    signingPublicKey: string,
  ) => Promise<boolean>,
  +markPrekeysAsPublished: () => Promise<void>,
};
