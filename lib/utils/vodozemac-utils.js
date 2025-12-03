// @flow

import { Account, Session } from '@commapp/vodozemac';

// Helper function to get 32-byte pickle key for vodozemac
function getVodozemacPickleKey(picklingKey: string): Uint8Array {
  const fullKeyBytes = new TextEncoder().encode(picklingKey);
  // NOTE: vodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  return fullKeyBytes.slice(0, 32);
}

function unpickleVodozemacAccount({
  picklingKey,
  pickledAccount,
}: {
  +picklingKey: string,
  +pickledAccount: string,
}): Account {
  const fullKeyBytes = new TextEncoder().encode(picklingKey);
  const keyBytes = getVodozemacPickleKey(picklingKey);
  try {
    // First try vodozemac native format
    return Account.from_pickle(pickledAccount, keyBytes);
  } catch (e) {
    console.log(
      'Failed to unpickle account with vodozemac format, falling back to libolm:',
      e.message,
    );
    return Account.from_libolm_pickle(pickledAccount, fullKeyBytes);
  }
}

function unpickleVodozemacSession({
  picklingKey,
  pickledSession,
}: {
  +picklingKey: string,
  +pickledSession: string,
}): Session {
  const fullKeyBytes = new TextEncoder().encode(picklingKey);
  const keyBytes = getVodozemacPickleKey(picklingKey);
  try {
    // First try vodozemac native format
    return Session.from_pickle(pickledSession, keyBytes);
  } catch (e) {
    console.log(
      'Failed to unpickle session with vodozemac format, falling back to libolm:',
      e.message,
    );
    return Session.from_libolm_pickle(pickledSession, fullKeyBytes);
  }
}

export {
  getVodozemacPickleKey,
  unpickleVodozemacAccount,
  unpickleVodozemacSession,
};
