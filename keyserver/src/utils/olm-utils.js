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

let cachedOLMUtility: OlmUtility;
function getOlmUtility(): OlmUtility {
  if (cachedOLMUtility) {
    return cachedOLMUtility;
  }
  cachedOLMUtility = new olm.Utility();
  return cachedOLMUtility;
}

async function validateAccountPrekey(account: OlmAccount): Promise<void> {
  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());

  let prekeyPublished;
  try {
    prekeyPublished = !account.unpublished_prekey();
  } catch (e) {
    // Until https://linear.app/comm/issue/ENG-3843/
    // is not resolved this method will throw an
    // exception if there is no unpublished prekey
    prekeyPublished = true;
  }

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

export {
  createPickledOlmAccount,
  getOlmUtility,
  unpickleOlmAccount,
  validateAccountPrekey,
};
