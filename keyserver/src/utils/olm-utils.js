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

import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
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
  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());

  const prekeyPublished = !account.unpublished_prekey();
  if (
    prekeyPublished &&
    currentDate - lastPrekeyPublishDate > maxPublishedPrekeyAge
  ) {
    // If there is no prekey or the current prekey is older than month
    // we need to generate new one.
    account.generate_prekey();
  }

  if (
    prekeyPublished &&
    currentDate - lastPrekeyPublishDate >= maxOldPrekeyAge
  ) {
    account.forget_old_prekey();
  }
}

async function uploadNewOneTimeKeys(numberOfKeys: number) {
  const [rustAPI, identityInfo] = await Promise.all([
    getRustAPI(),
    fetchIdentityInfo(),
  ]);

  if (!identityInfo) {
    throw new ServerError('missing_identity_info');
  }

  await fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) => {
    contentAccount.generate_one_time_keys(numberOfKeys);
    const contentOneTimeKeys = getOneTimeKeyValuesFromBlob(
      contentAccount.one_time_keys(),
    );
    const deviceID = JSON.parse(contentAccount.identity_keys()).curve25519;

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

export {
  createPickledOlmAccount,
  createPickledOlmSession,
  getOlmUtility,
  unpickleOlmAccount,
  unpickleOlmSession,
  validateAccountPrekey,
  uploadNewOneTimeKeys,
};
