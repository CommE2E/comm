// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { values } from './objects.js';
import { getOneTimeKeyValuesFromBlob } from '../shared/crypto-utils.js';
import { ONE_TIME_KEYS_NUMBER } from '../types/identity-service-types.js';

const maxPublishedPrekeyAge = 30 * 24 * 60 * 60 * 1000;
const maxOldPrekeyAge = 24 * 60 * 60 * 1000;

type AccountKeysSet = {
  +identityKeys: string,
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKeys: $ReadOnlyArray<string>,
};

function validateAccountPrekey(account: OlmAccount) {
  if (shouldRotatePrekey(account)) {
    account.generate_prekey();
  }
  if (shouldForgetPrekey(account)) {
    account.forget_old_prekey();
  }
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

  return (
    currentDate.getTime() - lastPrekeyPublishDate.getTime() >=
    maxPublishedPrekeyAge
  );
}

function shouldForgetPrekey(account: OlmAccount): boolean {
  // Our fork of Olm only remembers two prekeys at a time.
  // We have to hold onto the old one until the new one is published.
  if (account.unpublished_prekey()) {
    return false;
  }

  const currentDate = new Date();
  const lastPrekeyPublishDate = getLastPrekeyPublishTime(account);

  return (
    currentDate.getTime() - lastPrekeyPublishDate.getTime() >= maxOldPrekeyAge
  );
}

function getLastPrekeyPublishTime(account: OlmAccount): Date {
  const olmLastPrekeyPublishTime = account.last_prekey_publish_time();

  // Olm uses seconds, while in Node we need milliseconds.
  return new Date(olmLastPrekeyPublishTime * 1000);
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

function retrieveAccountKeysSet(account: OlmAccount): AccountKeysSet {
  const identityKeys = account.identity_keys();

  validateAccountPrekey(account);
  const { prekey, prekeySignature } = getAccountPrekeysSet(account);

  if (!prekeySignature || !prekey) {
    throw new Error('invalid_prekey');
  }

  let oneTimeKeys = getOneTimeKeyValuesFromBlob(account.one_time_keys());

  if (oneTimeKeys.length < ONE_TIME_KEYS_NUMBER) {
    account.generate_one_time_keys(ONE_TIME_KEYS_NUMBER);
    oneTimeKeys = getOneTimeKeyValuesFromBlob(account.one_time_keys());
  }

  return { identityKeys, oneTimeKeys, prekey, prekeySignature };
}

export {
  retrieveAccountKeysSet,
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
};
