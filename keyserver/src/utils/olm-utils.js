// @flow

import olm from '@commapp/olm';
import type {
  Account as OlmAccount,
  Utility as OlmUtility,
  Session as OlmSession,
} from '@commapp/olm';
import { getRustAPI } from 'rust-node-addon';
import uuid from 'uuid';

import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import { values } from 'lib/utils/objects.js';

import { fetchIdentityInfo } from '../user/identity.js';

type PickledOlmAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

const maxPublishedPrekeyAge = 30 * 24 * 60 * 60 * 1000;
const maxOldPrekeyAge = 24 * 60 * 60 * 1000;

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
): Promise<string> {
  await olm.init();
  const session = new olm.Session();
  session.create_inbound(account, initialEncryptedMessage);
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

function getOneTimeKeyValues(keyBlob: string): $ReadOnlyArray<string> {
  const content: OLMOneTimeKeys = JSON.parse(keyBlob);
  const keys: $ReadOnlyArray<string> = values(content.curve25519);
  return keys;
}

function shouldRotatePrekey(account: OlmAccount): boolean {
  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());
  const prekeyPublished = !account.unpublished_prekey();

  const shouldRotate =
    prekeyPublished &&
    currentDate - lastPrekeyPublishDate > maxPublishedPrekeyAge;

  return shouldRotate;
}

function shouldForgetPrekey(account: OlmAccount): boolean {
  if (account.unpublished_prekey()) {
    return false;
  }

  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());

  return currentDate - lastPrekeyPublishDate >= maxOldPrekeyAge;
}

async function revalidateAccountPrekeys(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  // Since keys are rotated synchronously, only check validity of one
  if (shouldRotatePrekey(contentAccount)) {
    await publishNewPrekeys(contentAccount, notifAccount);
  }
  if (shouldForgetPrekey(contentAccount)) {
    contentAccount.forget_old_prekey();
    notifAccount.forget_old_prekey();
  }
}

async function publishNewPrekeys(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  const rustAPIPromise = getRustAPI();
  const fetchIdentityInfoPromise = fetchIdentityInfo();

  contentAccount.generate_prekey();
  notifAccount.generate_prekey();
  const deviceId = JSON.parse(contentAccount.identity_keys()).curve25519;

  const contentPrekeyMap = JSON.parse(contentAccount.prekey()).curve25519;
  const [contentPrekey] = values(contentPrekeyMap);
  const contentPrekeySignature = contentAccount.prekey_signature();

  const notifPrekeyMap = JSON.parse(notifAccount.prekey()).curve25519;
  const [notifPrekey] = values(notifPrekeyMap);
  const notifPrekeySignature = notifAccount.prekey_signature();

  if (!contentPrekeySignature || !notifPrekeySignature) {
    console.warn('Warning: Unable to create valid signature for a prekey');
    return;
  }

  const [rustAPI, identityInfo] = await Promise.all([
    rustAPIPromise,
    fetchIdentityInfoPromise,
  ]);

  if (!identityInfo) {
    console.warn(
      'Warning: Attempted to refresh prekeys before registering with identity service',
    );
    return;
  }

  await rustAPI.publish_prekeys(
    identityInfo.userId,
    deviceId,
    identityInfo.accessToken,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  );

  contentAccount.mark_prekey_as_published();
  notifAccount.mark_prekey_as_published();
}

function validateAccountPrekey(account: OlmAccount) {
  if (shouldRotatePrekey(account)) {
    // If there is no prekey or the current prekey is older than month
    // we need to generate new one.
    account.generate_prekey();
  }

  if (shouldForgetPrekey(account)) {
    account.forget_old_prekey();
  }
}

export {
  createPickledOlmAccount,
  createPickledOlmSession,
  getOlmUtility,
  getOneTimeKeyValues,
  unpickleOlmAccount,
  unpickleOlmSession,
  validateAccountPrekey,
  revalidateAccountPrekeys,
  publishNewPrekeys,
};
