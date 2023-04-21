// @flow

import olm from '@commapp/olm';
import type {
  Account as OlmAccount,
  Utility as OlmUtility,
} from '@commapp/olm';
import uuid from 'uuid';

type PickledOlmAccount = {
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

async function unpicklePickledOlmAccount(
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

let cachedOLMUtility: OlmUtility;
function getOlmUtility(): OlmUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

async function validateAccountPrekey(account: OlmAccount): Promise<void> {
  const prekey = JSON.parse(account.prekey());

  const hasPrekey = Object.keys(prekey.curve25519).length !== 0;
  const prekeyPublished = account.last_prekey_publish_time() !== 0;

  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());

  const maxPublishedPrekeyAge = 30 * 24 * 60 * 60 * 1000;
  if (
    !hasPrekey ||
    (prekeyPublished &&
      currentDate - lastPrekeyPublishDate > maxPublishedPrekeyAge)
  ) {
    // If there is no prekey or the current prekey is older than month
    // we need to generate new one.
    account.generate_prekey();
  }

  const maxOldPrekeyAge = 24 * 60 * 60 * 1000;
  if (
    prekeyPublished &&
    currentDate - lastPrekeyPublishDate >= maxOldPrekeyAge
  ) {
    account.forget_old_prekey();
  }
}

export {
  createPickledOlmAccount,
  getOlmUtility,
  unpicklePickledOlmAccount,
  validateAccountPrekey,
};
