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
  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());
  const prekeyPublished = !account.unpublished_prekey();

  const shouldForget =
    prekeyPublished && currentDate - lastPrekeyPublishDate >= maxOldPrekeyAge;

  return shouldForget;
}

async function revalidateAccountPrekeys(
  content_account: OlmAccount,
  notif_account: OlmAccount,
): Promise<void> {
  // Since keys are rotated synchronously, only check validity of one
  if (shouldRotatePrekey(content_account)) {
    await publishNewPrekeys(content_account, notif_account);
  }
  if (shouldForgetPrekey(content_account)) {
    content_account.forget_old_prekey();
    notif_account.forget_old_prekey();
  }
}

async function publishNewPrekeys(
  content_account: OlmAccount,
  notif_account: OlmAccount,
): Promise<void> {
  const rustAPIPromise = getRustAPI();
  const fetchIdentityInfoPromise = fetchIdentityInfo();

  content_account.generate_prekey();
  notif_account.generate_prekey();
  const device_id = JSON.parse(content_account.identity_keys()).curve25519;

  const content_prekeyMap = JSON.parse(content_account.prekey()).curve25519;
  const [content_prekey] = values(content_prekeyMap);
  const content_prekeySignature = content_account.prekey_signature();

  const notif_prekeyMap = JSON.parse(notif_account.prekey()).curve25519;
  const [notif_prekey] = values(notif_prekeyMap);
  const notif_prekeySignature = notif_account.prekey_signature();

  if (!content_prekeySignature || !notif_prekeySignature) {
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
    device_id,
    identityInfo.accessToken,
    content_prekey,
    content_prekeySignature,
    notif_prekey,
    notif_prekeySignature,
  );

  content_account.mark_prekey_as_published();
  notif_account.mark_prekey_as_published();
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
  unpickleOlmAccount,
  unpickleOlmSession,
  validateAccountPrekey,
  revalidateAccountPrekeys,
  publishNewPrekeys,
};
