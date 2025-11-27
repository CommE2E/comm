// @flow

import type { Account as VodozemacAccount } from 'vodozemac';

import { ONE_TIME_KEYS_NUMBER } from '../types/identity-service-types.js';

const maxPublishedPrekeyAge = 30 * 24 * 60 * 60 * 1000; // 30 days
const maxOldPrekeyAge = 24 * 60 * 60 * 1000; // 24 hours

type AccountKeysSet = {
  +identityKeys: string,
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKeys: $ReadOnlyArray<string>,
};

function validateAccountPrekey(account: VodozemacAccount) {
  if (shouldRotatePrekey(account)) {
    account.generate_prekey();
  }
  if (shouldForgetPrekey(account)) {
    account.forget_old_prekey();
  }
}

function shouldRotatePrekey(account: VodozemacAccount): boolean {
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

function shouldForgetPrekey(account: VodozemacAccount): boolean {
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

function getLastPrekeyPublishTime(account: VodozemacAccount): Date {
  const vodozemacLastPrekeyPublishTime = account.last_prekey_publish_time();

  // Vodozemac uses seconds, while the Date() constructor expects milliseconds.
  return new Date(Number(vodozemacLastPrekeyPublishTime) * 1000);
}

function getAccountPrekeysSet(account: VodozemacAccount): {
  +prekey: string,
  +prekeySignature: ?string,
} {
  const prekey = account.prekey();
  if (!prekey) {
    throw Error('Prekey is missing');
  }
  const prekeySignature = account.prekey_signature();
  return { prekey, prekeySignature };
}

function getAccountOneTimeKeys(
  account: VodozemacAccount,
  numberOfKeys: number = ONE_TIME_KEYS_NUMBER,
): $ReadOnlyArray<string> {
  let oneTimeKeys = [...account.one_time_keys().values()];
  if (oneTimeKeys.length < numberOfKeys) {
    account.generate_one_time_keys(numberOfKeys - oneTimeKeys.length);
    oneTimeKeys = [...account.one_time_keys().values()];
  }
  return oneTimeKeys;
}

function retrieveAccountKeysSet(account: VodozemacAccount): AccountKeysSet {
  const identityKeys = JSON.stringify({
    ed25519: account.ed25519_key,
    curve25519: account.curve25519_key,
  });

  validateAccountPrekey(account);
  const { prekey, prekeySignature } = getAccountPrekeysSet(account);

  if (!prekeySignature || !prekey) {
    throw new Error('invalid_prekey');
  }

  const oneTimeKeys = getAccountOneTimeKeys(account, ONE_TIME_KEYS_NUMBER);

  return { identityKeys, oneTimeKeys, prekey, prekeySignature };
}

export const OLM_SESSION_ERROR_PREFIX = 'OLM_';

// this constant has to match olmErrorFlag constant
// in native/cpp/CommonCpp/CryptoTools/Session.cpp
export const OLM_ERROR_FLAG = 'OLM_ERROR';

const olmSessionErrors = Object.freeze({
  // Two clients send the session request to each other at the same time,
  // we choose which session to keep based on `deviceID`.
  raceCondition: `${OLM_SESSION_ERROR_PREFIX}SESSION_CREATION_RACE_CONDITION`,
  // The client received a session request with a lower session version,
  // this request can be ignored.
  alreadyCreated: `${OLM_SESSION_ERROR_PREFIX}SESSION_ALREADY_CREATED`,
  // Error thrown when attempting to encrypt/decrypt, indicating that
  // the session for a given deviceID is not created.
  // This definition should remain in sync with the value defined in
  // the corresponding .cpp file
  // at `native/cpp/CommonCpp/CryptoTools/CryptoModule.cpp`.
  sessionDoesNotExist: 'SESSION_DOES_NOT_EXIST',
  // Error thrown when attempting to decrypt a message encrypted
  // with an already replaced old session.
  // This definition should remain in sync with the value defined in
  // the corresponding .cpp file
  // at `native/cpp/CommonCpp/CryptoTools/CryptoModule.cpp`.
  invalidSessionVersion: 'INVALID_SESSION_VERSION',
  alreadyDecrypted:
    OLM_SESSION_ERROR_PREFIX + `ALREADY_DECRYPTED_OR_KEYS_SKIPPED`,
});

function hasHigherDeviceID(
  currenDeviceID: string,
  otherDeviceID: string,
): boolean {
  const compareResult = currenDeviceID.localeCompare(otherDeviceID);
  if (compareResult === 0) {
    throw new Error('Comparing the same deviceIDs');
  }
  return compareResult === 1;
}

export {
  retrieveAccountKeysSet,
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
  getAccountOneTimeKeys,
  hasHigherDeviceID,
  olmSessionErrors,
};
