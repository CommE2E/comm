// @flow

import olm from '@commapp/olm';
import type {
  Account as OlmAccount,
  Utility as OlmUtility,
  Session as OlmSession,
} from '@commapp/olm';
import { getRustAPI } from 'rust-node-addon';
import uuid from 'uuid';

import { getOneTimeKeyValuesFromBlob } from 'lib/shared/crypto-utils.js';
import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import {
  fetchCallUpdateOlmAccount,
  fetchOlmAccount,
} from '../updaters/olm-account-updater.js';
import { fetchIdentityInfo } from '../user/identity.js';

type PickledOlmAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

const maxPublishedPrekeyAge = 30 * 24 * 60 * 60 * 1000;
const maxOldPrekeyAge = 24 * 60 * 60 * 1000;

function getLastPrekeyPublishTime(account: OlmAccount): Date {
  const olmLastPrekeyPublishTime = account.last_prekey_publish_time();

  // Olm uses seconds, while in Node we need milliseconds.
  return new Date(olmLastPrekeyPublishTime * 1000);
}

function shouldRotatePrekey(account: OlmAccount): boolean {
  // Our fork of Olm only remembers two prekeys at a time.
  // If the new one hasn't been published, then the old one is still active.
  // In that scenario, we need to avoid rotating the prekey because it will
  // result in the old active prekey being discarded.
  if (account.unpublished_prekey()) {
    return false;
  }

  const currentDate = new Date();
  const lastPrekeyPublishDate = getLastPrekeyPublishTime(account);

  return currentDate - lastPrekeyPublishDate >= maxPublishedPrekeyAge;
}

function shouldForgetPrekey(account: OlmAccount): boolean {
  // Our fork of Olm only remembers two prekeys at a time.
  // We have to hold onto the old one until the new one is published.
  if (account.unpublished_prekey()) {
    return false;
  }

  const currentDate = new Date();
  const lastPrekeyPublishDate = getLastPrekeyPublishTime(account);

  return currentDate - lastPrekeyPublishDate >= maxOldPrekeyAge;
}

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

function validateAccountPrekey(account: OlmAccount) {
  if (shouldRotatePrekey(account)) {
    account.generate_prekey();
  }
  if (shouldForgetPrekey(account)) {
    account.forget_old_prekey();
  }
}

async function uploadNewOneTimeKeys(numberOfKeys: number) {
  const [rustAPI, identityInfo, deviceID] = await Promise.all([
    getRustAPI(),
    fetchIdentityInfo(),
    getContentSigningKey(),
  ]);

  if (!identityInfo) {
    throw new ServerError('missing_identity_info');
  }

  await fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) => {
    contentAccount.generate_one_time_keys(numberOfKeys);
    const contentOneTimeKeys = getOneTimeKeyValuesFromBlob(
      contentAccount.one_time_keys(),
    );

    return fetchCallUpdateOlmAccount(
      'notifications',
      async (notifAccount: OlmAccount) => {
        notifAccount.generate_one_time_keys(numberOfKeys);
        const notifOneTimeKeys = getOneTimeKeyValuesFromBlob(
          notifAccount.one_time_keys(),
        );
        await rustAPI.uploadOneTimeKeys(
          identityInfo.userId,
          deviceID,
          identityInfo.accessToken,
          contentOneTimeKeys,
          notifOneTimeKeys,
        );

        notifAccount.mark_keys_as_published();
        contentAccount.mark_keys_as_published();
      },
    );
  });
}

async function getContentSigningKey(): Promise<string> {
  const accountInfo = await fetchOlmAccount('content');
  return JSON.parse(accountInfo.account.identity_keys()).ed25519;
}

function getAccountPrekeysSet(account: OlmAccount): {
  +prekey: string,
  +prekeySignature: ?string,
} {
  const prekeyMap = JSON.parse(account.prekey()).curve25519;
  const [prekey] = values(prekeyMap);
  const prekeySignature = account.prekey_signature();
  return { prekey, prekeySignature };
}

async function validateAndUploadAccountPrekeys(
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

  const deviceID = JSON.parse(contentAccount.identity_keys()).ed25519;

  contentAccount.generate_prekey();
  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    getAccountPrekeysSet(contentAccount);

  notifAccount.generate_prekey();
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    getAccountPrekeysSet(notifAccount);

  if (!contentPrekeySignature || !notifPrekeySignature) {
    console.warn('Unable to create valid signature for a prekey');
    return;
  }

  const [rustAPI, identityInfo] = await Promise.all([
    rustAPIPromise,
    fetchIdentityInfoPromise,
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

  contentAccount.mark_prekey_as_published();
  notifAccount.mark_prekey_as_published();
}

export {
  createPickledOlmAccount,
  createPickledOlmSession,
  getOlmUtility,
  unpickleOlmAccount,
  unpickleOlmSession,
  validateAccountPrekey,
  uploadNewOneTimeKeys,
  getContentSigningKey,
  getAccountPrekeysSet,
  validateAndUploadAccountPrekeys,
};
