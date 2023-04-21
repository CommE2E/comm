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
  const hasPrekey = !!account.prekey_signature();
  const prekeyPublished = !account.unpublished_prekey();

  const currentDate = new Date();
  const lastPrekeyPublishDate = new Date(account.last_prekey_publish_time());

  if (
    !hasPrekey ||
    (prekeyPublished &&
      currentDate - lastPrekeyPublishDate > maxPublishedPrekeyAge)
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
