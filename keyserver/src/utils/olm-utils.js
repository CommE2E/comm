// @flow

import olm from '@commapp/olm';
import type {
  Account as OlmAccount,
  Utility as OlmUtility,
  Session as OlmSession,
} from '@commapp/olm';
import invariant from 'invariant';
import uuid from 'uuid';

import { getOneTimeKeyValuesFromBlob } from 'lib/shared/crypto-utils.js';
import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import type { IdentityNewDeviceKeyUpload } from 'lib/types/identity-service-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
  retrieveAccountKeysSet,
} from 'lib/utils/olm-utils.js';

import { publishPrekeys, uploadOneTimeKeys } from './identity-utils.js';
import {
  fetchCallUpdateOlmAccount,
  fetchOlmAccount,
} from '../updaters/olm-account-updater.js';
import { verifyUserLoggedIn } from '../user/login.js';

export type PickledOlmAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

async function createPickledOlmAccount(): Promise<PickledOlmAccount> {
  await olm.init();
  const account = new olm.Account();
  account.create();

  const picklingKey = uuid.v4();
  const pickledAccount = account.pickle(picklingKey);

  return {
    picklingKey: picklingKey,
    pickledAccount: pickledAccount,
  };
}

async function unpickleOlmAccount(
  pickledOlmAccount: PickledOlmAccount,
): Promise<OlmAccount> {
  await olm.init();
  const account = new olm.Account();

  account.unpickle(
    pickledOlmAccount.picklingKey,
    pickledOlmAccount.pickledAccount,
  );
  return account;
}

async function createPickledOlmSession(
  account: OlmAccount,
  accountPicklingKey: string,
  initialEncryptedMessage: string,
  theirCurve25519Key?: string,
): Promise<string> {
  await olm.init();
  const session = new olm.Session();

  if (theirCurve25519Key) {
    session.create_inbound_from(
      account,
      theirCurve25519Key,
      initialEncryptedMessage,
    );
  } else {
    session.create_inbound(account, initialEncryptedMessage);
  }

  account.remove_one_time_keys(session);
  session.decrypt(olmEncryptedMessageTypes.PREKEY, initialEncryptedMessage);
  return session.pickle(accountPicklingKey);
}

async function unpickleOlmSession(
  pickledSession: string,
  picklingKey: string,
): Promise<OlmSession> {
  await olm.init();
  const session = new olm.Session();
  session.unpickle(picklingKey, pickledSession);
  return session;
}

let cachedOLMUtility: OlmUtility;

function getOlmUtility(): OlmUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  // This Olm Utility is created once and is cached for the entire
  // program lifetime, there is no need to free the memory.
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

async function markPrekeysAsPublished(): Promise<void> {
  await Promise.all([
    fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) => {
      contentAccount.mark_prekey_as_published();
    }),
    fetchCallUpdateOlmAccount('notifications', (notifAccount: OlmAccount) => {
      notifAccount.mark_prekey_as_published();
    }),
  ]);
}

async function getNewDeviceKeyUpload(): Promise<IdentityNewDeviceKeyUpload> {
  let contentIdentityKeys: string;
  let contentOneTimeKeys: $ReadOnlyArray<string>;
  let contentPrekey: string;
  let contentPrekeySignature: string;

  let notifIdentityKeys: string;
  let notifOneTimeKeys: $ReadOnlyArray<string>;
  let notifPrekey: string;
  let notifPrekeySignature: string;

  let contentAccountInfo: OlmAccount;

  await Promise.all([
    fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) => {
      const { identityKeys, oneTimeKeys, prekey, prekeySignature } =
        retrieveAccountKeysSet(contentAccount);
      contentIdentityKeys = identityKeys;
      contentOneTimeKeys = oneTimeKeys;
      contentPrekey = prekey;
      contentPrekeySignature = prekeySignature;
      contentAccountInfo = contentAccount;
      contentAccount.mark_keys_as_published();
    }),
    fetchCallUpdateOlmAccount('notifications', (notifAccount: OlmAccount) => {
      const { identityKeys, oneTimeKeys, prekey, prekeySignature } =
        retrieveAccountKeysSet(notifAccount);
      notifIdentityKeys = identityKeys;
      notifOneTimeKeys = oneTimeKeys;
      notifPrekey = prekey;
      notifPrekeySignature = prekeySignature;
      notifAccount.mark_keys_as_published();
    }),
  ]);

  invariant(
    contentIdentityKeys,
    'content identity keys not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    notifIdentityKeys,
    'notif identity keys not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    contentPrekey,
    'content prekey not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    notifPrekey,
    'notif prekey not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    contentPrekeySignature,
    'content prekey signature not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    notifPrekeySignature,
    'notif prekey signature not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    contentOneTimeKeys,
    'content one-time keys not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    notifOneTimeKeys,
    'notif one-time keys not set after fetchCallUpdateOlmAccount',
  );

  invariant(
    contentAccountInfo,
    'content account info not set after fetchCallUpdateOlmAccount',
  );

  const identityKeysBlob = {
    primaryIdentityPublicKeys: JSON.parse(contentIdentityKeys),
    notificationIdentityPublicKeys: JSON.parse(notifIdentityKeys),
  };
  const keyPayload = JSON.stringify(identityKeysBlob);
  const keyPayloadSignature = contentAccountInfo.sign(keyPayload);

  return {
    keyPayload,
    keyPayloadSignature,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
    contentOneTimeKeys,
    notifOneTimeKeys,
  };
}

async function uploadNewOneTimeKeys(numberOfKeys: number) {
  const identityInfo = await verifyUserLoggedIn();
  if (!identityInfo) {
    throw new ServerError('missing_identity_info');
  }

  let contentOneTimeKeys: ?$ReadOnlyArray<string>;
  let notifOneTimeKeys: ?$ReadOnlyArray<string>;

  await Promise.all([
    fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) => {
      contentAccount.generate_one_time_keys(numberOfKeys);
      contentOneTimeKeys = getOneTimeKeyValuesFromBlob(
        contentAccount.one_time_keys(),
      );
      contentAccount.mark_keys_as_published();
    }),
    fetchCallUpdateOlmAccount('notifications', (notifAccount: OlmAccount) => {
      notifAccount.generate_one_time_keys(numberOfKeys);
      notifOneTimeKeys = getOneTimeKeyValuesFromBlob(
        notifAccount.one_time_keys(),
      );
      notifAccount.mark_keys_as_published();
    }),
  ]);

  invariant(
    contentOneTimeKeys,
    'content one-time keys not set after fetchCallUpdateOlmAccount',
  );
  invariant(
    notifOneTimeKeys,
    'notif one-time keys not set after fetchCallUpdateOlmAccount',
  );

  await uploadOneTimeKeys(identityInfo, contentOneTimeKeys, notifOneTimeKeys);
}

async function getContentSigningKey(): Promise<string> {
  const accountInfo = await fetchOlmAccount('content');
  return JSON.parse(accountInfo.account.identity_keys()).ed25519;
}

function validateAndUploadAccountPrekeys(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  if (contentAccount.unpublished_prekey()) {
    return publishPrekeysToIdentity(contentAccount, notifAccount);
  }
  // Since keys are rotated synchronously, only check validity of one
  if (shouldRotatePrekey(contentAccount)) {
    contentAccount.generate_prekey();
    notifAccount.generate_prekey();
    return publishPrekeysToIdentity(contentAccount, notifAccount);
  }
  if (shouldForgetPrekey(contentAccount)) {
    contentAccount.forget_old_prekey();
    notifAccount.forget_old_prekey();
  }
  return Promise.resolve();
}

async function publishPrekeysToIdentity(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  const deviceID = JSON.parse(contentAccount.identity_keys()).ed25519;

  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    getAccountPrekeysSet(contentAccount);
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    getAccountPrekeysSet(notifAccount);

  if (!contentPrekeySignature || !notifPrekeySignature) {
    console.warn('Unable to create valid signature for a prekey');
    return;
  }

  await publishPrekeys(
    deviceID,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  );

  contentAccount.mark_prekey_as_published();
  notifAccount.mark_prekey_as_published();
}

export {
  createPickledOlmAccount,
  createPickledOlmSession,
  getOlmUtility,
  unpickleOlmAccount,
  unpickleOlmSession,
  uploadNewOneTimeKeys,
  getContentSigningKey,
  validateAndUploadAccountPrekeys,
  publishPrekeysToIdentity,
  getNewDeviceKeyUpload,
  markPrekeysAsPublished,
};
