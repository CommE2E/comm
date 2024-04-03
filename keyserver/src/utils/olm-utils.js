// @flow

import olm from '@commapp/olm';
import type {
  Account as OlmAccount,
  Utility as OlmUtility,
  Session as OlmSession,
} from '@commapp/olm';
import invariant from 'invariant';
import { getRustAPI } from 'rust-node-addon';
import uuid from 'uuid';

import { getOneTimeKeyValuesFromBlob } from 'lib/shared/crypto-utils.js';
import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
} from 'lib/utils/olm-utils.js';

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
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

async function uploadNewOneTimeKeys(numberOfKeys: number) {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);

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

  await rustAPI.uploadOneTimeKeys(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    contentOneTimeKeys,
    notifOneTimeKeys,
  );
}

async function getContentSigningKey(): Promise<string> {
  const accountInfo = await fetchOlmAccount('content');
  return JSON.parse(accountInfo.account.identity_keys()).ed25519;
}

async function validateAndUploadAccountPrekeys(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  // Since keys are rotated synchronously, only check validity of one
  if (shouldRotatePrekey(contentAccount)) {
    contentAccount.generate_prekey();
    notifAccount.generate_prekey();
    await publishPrekeysToIdentity(contentAccount, notifAccount);
    contentAccount.mark_prekey_as_published();
    notifAccount.mark_prekey_as_published();
  }
  if (shouldForgetPrekey(contentAccount)) {
    contentAccount.forget_old_prekey();
    notifAccount.forget_old_prekey();
  }
}

async function publishPrekeysToIdentity(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  const rustAPIPromise = getRustAPI();
  const verifyUserLoggedInPromise = verifyUserLoggedIn();
  const deviceID = JSON.parse(contentAccount.identity_keys()).ed25519;

  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    getAccountPrekeysSet(contentAccount);
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    getAccountPrekeysSet(notifAccount);

  if (!contentPrekeySignature || !notifPrekeySignature) {
    console.warn('Unable to create valid signature for a prekey');
    return;
  }

  const [rustAPI, identityInfo] = await Promise.all([
    rustAPIPromise,
    verifyUserLoggedInPromise,
  ]);

  if (!identityInfo) {
    console.warn(
      'Attempted to refresh prekeys before registering with Identity service',
    );
    return;
  }

  await rustAPI.publishPrekeys(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  );
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
};
